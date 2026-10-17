-- Complete replacement for public.submit_assessment(uuid).
-- Fixes: status is submission_status but expression is text.
-- Safe submission flow: ownership check, completeness check, objective grading,
-- typed status update, and protection against resubmission.

drop function if exists public.submit_assessment(uuid);

create function public.submit_assessment(target_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_submission public.assessment_submissions%rowtype;
  calculated_objective_score numeric := 0;
  has_written_answers boolean := false;
begin
  select *
  into target_submission
  from public.assessment_submissions
  where id = target_submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  if target_submission.student_id <> auth.uid() then
    raise exception 'You may only submit your own assessment';
  end if;

  if target_submission.status::text in ('submitted', 'graded') then
    raise exception 'This assessment has already been submitted';
  end if;

  if exists (
    select 1
    from public.questions q
    left join public.student_answers sa
      on sa.submission_id = target_submission.id
     and sa.question_id = q.id
    where q.assessment_id = target_submission.assessment_id
      and sa.id is null
  ) then
    raise exception 'Please answer every question before submitting';
  end if;

  select
    coalesce(sum(
      case
        when q.kind::text <> 'essay'
         and upper(left(trim(coalesce(sa.selected_answer, '')), 1)) = upper(left(trim(coalesce(qk.correct_answer, '')), 1))
        then coalesce(q.points, 1)
        else 0
      end
    ), 0),
    coalesce(bool_or(q.kind::text = 'essay'), false)
  into calculated_objective_score, has_written_answers
  from public.questions q
  left join public.student_answers sa
    on sa.submission_id = target_submission.id
   and sa.question_id = q.id
  left join public.question_keys qk
    on qk.question_id = q.id
  where q.assessment_id = target_submission.assessment_id;

  insert into public.submission_grades (
    submission_id,
    objective_score,
    manual_score,
    final_score
  ) values (
    target_submission.id,
    calculated_objective_score,
    0,
    case when has_written_answers then null else calculated_objective_score end
  )
  on conflict (submission_id) do update
  set
    objective_score = excluded.objective_score,
    final_score = excluded.final_score;

  update public.assessment_submissions
  set
    status = 'submitted'::public.submission_status,
    submitted_at = now()
  where id = target_submission.id;
end;
$$;

revoke all on function public.submit_assessment(uuid) from public;
grant execute on function public.submit_assessment(uuid) to authenticated;

-- Repair objective scores for submissions that were completed before this fix.
with recalculated as (
  select
    s.id as submission_id,
    s.status::text as submission_status,
    coalesce(bool_or(q.kind::text = 'essay'), false) as has_written_answers,
    coalesce(sum(
      case
        when q.kind::text <> 'essay'
         and upper(left(trim(coalesce(sa.selected_answer, '')), 1)) = upper(left(trim(coalesce(qk.correct_answer, '')), 1))
        then coalesce(q.points, 1)
        else 0
      end
    ), 0) as objective_score
  from public.assessment_submissions s
  join public.questions q on q.assessment_id = s.assessment_id
  left join public.student_answers sa
    on sa.submission_id = s.id
   and sa.question_id = q.id
  left join public.question_keys qk on qk.question_id = q.id
  where s.status::text in ('submitted', 'graded')
  group by s.id, s.status
)
update public.submission_grades sg
set
  objective_score = recalculated.objective_score,
  final_score = case
    when recalculated.submission_status = 'submitted' and not recalculated.has_written_answers
      then recalculated.objective_score
    else sg.final_score
  end
from recalculated
where sg.submission_id = recalculated.submission_id;

-- Verification: should show return type "void" and authenticated execute access.
select
  p.oid::regprocedure::text as function_signature,
  pg_get_function_result(p.oid) as return_type,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'submit_assessment';
