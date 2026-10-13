-- Allow teachers to manage weeks, slides and vocabulary for their own courses.
-- This file is self-contained and can be run safely more than once.

create or replace function public.is_current_user_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  );
$$;

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

grant execute on function public.is_current_user_teacher() to authenticated;
grant execute on function public.current_teacher_owns_course(uuid) to authenticated;
grant execute on function public.current_teacher_owns_week(uuid) to authenticated;

drop policy if exists "Teacher manage own course weeks v2" on public.course_weeks;
create policy "Teacher manage own course weeks v2"
on public.course_weeks
for all
to authenticated
using (
  public.is_current_user_teacher()
  and public.current_teacher_owns_course(course_id)
)
with check (
  public.is_current_user_teacher()
  and public.current_teacher_owns_course(course_id)
);

drop policy if exists "Teacher manage own slides v2" on public.slides;
create policy "Teacher manage own slides v2"
on public.slides
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

drop policy if exists "Teacher manage own vocabulary v2" on public.vocabulary;
create policy "Teacher manage own vocabulary v2"
on public.vocabulary
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

