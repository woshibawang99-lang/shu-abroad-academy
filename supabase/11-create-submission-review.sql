-- Securely reveal answers and explanations only after a student submits.
create or replace function public.get_submission_review(target_submission_id uuid)
returns table (
  question_id uuid,
  question_kind text,
  question_text text,
  selected_answer text,
  correct_answer text,
  explanation text,
  points numeric,
  awarded_points numeric
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.kind::text,
    q.question_text,
    sa.selected_answer,
    qk.correct_answer,
    qk.explanation,
    q.points,
    case
      when q.kind::text = 'choice' then
        case when upper(trim(coalesce(sa.selected_answer, ''))) = upper(trim(coalesce(qk.correct_answer, '')))
          then q.points else 0 end
      else ag.awarded_points
    end
  from public.assessment_submissions s
  join public.questions q on q.assessment_id = s.assessment_id
  left join public.student_answers sa
    on sa.submission_id = s.id and sa.question_id = q.id
  left join public.question_keys qk on qk.question_id = q.id
  left join public.answer_grades ag on ag.answer_id = sa.id
  where s.id = target_submission_id
    and s.status in ('submitted', 'graded')
    and (
      s.student_id = auth.uid()
      or public.is_submission_teacher(s.id)
    )
  order by q.question_number;
$$;

revoke all on function public.get_submission_review(uuid) from public;
grant execute on function public.get_submission_review(uuid) to authenticated;

