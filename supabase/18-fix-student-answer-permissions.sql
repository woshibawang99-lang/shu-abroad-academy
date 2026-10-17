-- Fix "permission denied for table student_answers" during student submission.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.student_answers enable row level security;

-- PostgREST still needs table-level privileges before RLS policies are checked.
grant select, insert, update, delete on table public.student_answers to authenticated;

create or replace function public.current_student_owns_submission(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessment_submissions s
    where s.id = target_submission_id
      and s.student_id = auth.uid()
  );
$$;

create or replace function public.current_student_can_edit_answer(
  target_submission_id uuid,
  target_question_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessment_submissions s
    join public.questions q
      on q.id = target_question_id
     and q.assessment_id = s.assessment_id
    where s.id = target_submission_id
      and s.student_id = auth.uid()
      and s.status::text not in ('submitted', 'graded')
  );
$$;

create or replace function public.current_student_can_edit_submission(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessment_submissions s
    where s.id = target_submission_id
      and s.student_id = auth.uid()
      and s.status::text not in ('submitted', 'graded')
  );
$$;

revoke all on function public.current_student_owns_submission(uuid) from public;
revoke all on function public.current_student_can_edit_answer(uuid, uuid) from public;
revoke all on function public.current_student_can_edit_submission(uuid) from public;
grant execute on function public.current_student_owns_submission(uuid) to authenticated;
grant execute on function public.current_student_can_edit_answer(uuid, uuid) to authenticated;
grant execute on function public.current_student_can_edit_submission(uuid) to authenticated;

drop policy if exists "Students view own answers v2" on public.student_answers;
create policy "Students view own answers v2"
on public.student_answers
for select
to authenticated
using (
  public.current_student_owns_submission(submission_id)
);

drop policy if exists "Students create own answers v2" on public.student_answers;
create policy "Students create own answers v2"
on public.student_answers
for insert
to authenticated
with check (
  public.current_student_can_edit_answer(submission_id, question_id)
);

drop policy if exists "Students update own answers v2" on public.student_answers;
create policy "Students update own answers v2"
on public.student_answers
for update
to authenticated
using (
  public.current_student_can_edit_answer(submission_id, question_id)
)
with check (
  public.current_student_can_edit_answer(submission_id, question_id)
);

drop policy if exists "Students delete own answers v2" on public.student_answers;
create policy "Students delete own answers v2"
on public.student_answers
for delete
to authenticated
using (
  public.current_student_can_edit_submission(submission_id)
);

-- Verification result: four student policies should be listed.
select
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'student_answers'
order by policyname;
