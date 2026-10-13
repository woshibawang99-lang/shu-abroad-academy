-- Read access used by the teacher's student completion dashboard.

create or replace function public.current_teacher_owns_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.courses
    where id = target_course_id
      and teacher_id = auth.uid()
  );
$$;

create or replace function public.current_teacher_can_view_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_enrollments e
    join public.courses c on c.id = e.course_id
    where e.student_id = target_student_id
      and c.teacher_id = auth.uid()
  );
$$;

grant execute on function public.current_teacher_owns_course(uuid) to authenticated;
grant execute on function public.current_teacher_can_view_student(uuid) to authenticated;

drop policy if exists "Teacher view own course enrollments v2" on public.course_enrollments;
create policy "Teacher view own course enrollments v2"
on public.course_enrollments
for select
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_course(course_id)
);

drop policy if exists "Teacher view enrolled student profiles v2" on public.profiles;
create policy "Teacher view enrolled student profiles v2"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (
    public.is_current_user_teacher()
    and public.current_teacher_can_view_student(id)
  )
);

drop policy if exists "Teacher view own assessment submissions v2" on public.assessment_submissions;
create policy "Teacher view own assessment submissions v2"
on public.assessment_submissions
for select
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_assessment(assessment_id)
);

drop policy if exists "Teacher update own assessment submissions v2" on public.assessment_submissions;
create policy "Teacher update own assessment submissions v2"
on public.assessment_submissions
for update
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_assessment(assessment_id)
)
with check (
  public.is_current_user_teacher()
  and public.current_teacher_owns_assessment(assessment_id)
);

