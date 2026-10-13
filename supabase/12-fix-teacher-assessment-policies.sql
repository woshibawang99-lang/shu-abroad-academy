-- Allow a signed-in teacher to manage assessments and questions
-- belonging to courses assigned to that teacher.

create or replace function public.is_current_user_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  );
$$;

create or replace function public.current_teacher_owns_week(target_week_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_weeks w
    join public.courses c on c.id = w.course_id
    where w.id = target_week_id
      and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.current_teacher_owns_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments a
    where a.id = target_assessment_id
      and public.current_teacher_owns_week(a.week_id)
  );
$$;

create or replace function public.current_teacher_owns_question(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.questions q
    where q.id = target_question_id
      and public.current_teacher_owns_assessment(q.assessment_id)
  );
$$;

grant execute on function public.is_current_user_teacher() to authenticated;
grant execute on function public.current_teacher_owns_week(uuid) to authenticated;
grant execute on function public.current_teacher_owns_assessment(uuid) to authenticated;
grant execute on function public.current_teacher_owns_question(uuid) to authenticated;

drop policy if exists "Teacher manage own assessments v2" on public.assessments;
create policy "Teacher manage own assessments v2"
on public.assessments
for all
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_week(week_id)
)
with check (
  public.is_current_user_teacher()
  and public.current_teacher_owns_week(week_id)
);

drop policy if exists "Teacher manage own questions v2" on public.questions;
create policy "Teacher manage own questions v2"
on public.questions
for all
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_assessment(assessment_id)
)
with check (
  public.is_current_user_teacher()
  and public.current_teacher_owns_assessment(assessment_id)
);

drop policy if exists "Teacher manage own question keys v2" on public.question_keys;
create policy "Teacher manage own question keys v2"
on public.question_keys
for all
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_question(question_id)
)
with check (
  public.is_current_user_teacher()
  and public.current_teacher_owns_question(question_id)
);

