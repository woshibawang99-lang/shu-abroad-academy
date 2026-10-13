-- Single-teacher deployment policy.
-- Any authenticated profile whose role is teacher may manage learning content.
-- Student access remains governed by the existing read-only policies.

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

grant execute on function public.is_current_user_teacher() to authenticated;

drop policy if exists "Teacher manage own course weeks v2" on public.course_weeks;
drop policy if exists "Teacher manage all course weeks" on public.course_weeks;
create policy "Teacher manage all course weeks"
on public.course_weeks
for all
to authenticated
using (public.is_current_user_teacher())
with check (public.is_current_user_teacher());

drop policy if exists "Teacher manage own slides v2" on public.slides;
drop policy if exists "Teacher manage all slides" on public.slides;
create policy "Teacher manage all slides"
on public.slides
for all
to authenticated
using (public.is_current_user_teacher())
with check (public.is_current_user_teacher());

drop policy if exists "Teacher manage own vocabulary v2" on public.vocabulary;
drop policy if exists "Teacher manage all vocabulary" on public.vocabulary;
create policy "Teacher manage all vocabulary"
on public.vocabulary
for all
to authenticated
using (public.is_current_user_teacher())
with check (public.is_current_user_teacher());

