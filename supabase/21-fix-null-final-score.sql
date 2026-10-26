-- Fix student submission failure:
-- null value in column "final_score" violates not-null constraint.
-- Safe to run more than once in the Supabase SQL Editor.

create or replace function public.submit_assessment(target_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_submission public.assessment_submissions%rowtype;
  calculated_objective_score numeric := 0;
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

  select coalesce(sum(
    case
      when q.kind::text <> 'essay'
       and upper(left(trim(coalesce(sa.selected_answer, '')), 1)) =
           upper(left(trim(coalesce(qk.correct_answer, '')), 1))
      then coalesce(q.points, 1)
      else 0
    end
  ), 0)
  into calculated_objective_score
  from public.questions q
  left join public.student_answers sa
    on sa.submission_id = target_submission.id
   and sa.question_id = q.id
  left join public.question_keys qk
    on qk.question_id = q.id
  where q.assessment_id = target_submission.assessment_id;

  insert into public.submission_grades as existing_grade (
    submission_id,
    objective_score,
    manual_score,
    final_score
  ) values (
    target_submission.id,
    calculated_objective_score,
    0,
    calculated_objective_score
  )
  on conflict (submission_id) do update
  set
    objective_score = excluded.objective_score,
    manual_score = coalesce(existing_grade.manual_score, 0),
    final_score = excluded.objective_score + coalesce(existing_grade.manual_score, 0);

  update public.assessment_submissions
  set
    status = 'submitted'::public.submission_status,
    submitted_at = now()
  where id = target_submission.id;
end;
$$;

revoke all on function public.submit_assessment(uuid) from public;
grant execute on function public.submit_assessment(uuid) to authenticated;

-- Verification: final_score should be NOT NULL, the function should return void,
-- and authenticated users should have execute access.
select
  cols.is_nullable as final_score_is_nullable,
  cols.column_default as final_score_default,
  p.oid::regprocedure::text as function_signature,
  pg_get_function_result(p.oid) as return_type,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from information_schema.columns cols
join pg_proc p on p.proname = 'submit_assessment'
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where cols.table_schema = 'public'
  and cols.table_name = 'submission_grades'
  and cols.column_name = 'final_score';
