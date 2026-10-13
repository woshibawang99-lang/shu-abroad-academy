-- Save one teaching week, all slides and all vocabulary in one transaction.
-- If any write fails, PostgreSQL rolls the whole operation back so existing
-- slides cannot disappear after a partial save.

create or replace function public.save_learning_week_content(
  target_course_id uuid,
  target_week_number integer,
  target_title text,
  slide_contents jsonb,
  vocabulary_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_week_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  ) then
    raise exception 'Teacher login is required';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = target_course_id
      and teacher_id = auth.uid()
  ) then
    raise exception 'This course is not assigned to the current teacher';
  end if;

  select id into saved_week_id
  from public.course_weeks
  where course_id = target_course_id
    and week_number = target_week_number
  limit 1;

  if saved_week_id is null then
    insert into public.course_weeks (course_id, week_number, title, is_published)
    values (target_course_id, target_week_number, coalesce(target_title, ''), true)
    returning id into saved_week_id;
  else
    update public.course_weeks
    set title = coalesce(target_title, ''),
        is_published = true
    where id = saved_week_id;
  end if;

  delete from public.slides where week_id = saved_week_id;
  insert into public.slides (week_id, slide_number, content_html)
  select saved_week_id, item.ordinality::integer, item.content
  from jsonb_array_elements_text(coalesce(slide_contents, '[]'::jsonb))
       with ordinality as item(content, ordinality);

  delete from public.vocabulary where week_id = saved_week_id;
  insert into public.vocabulary (week_id, term, definition, sort_order)
  select
    saved_week_id,
    coalesce(item.value ->> 'word', ''),
    coalesce(item.value ->> 'def', ''),
    item.ordinality::integer
  from jsonb_array_elements(coalesce(vocabulary_items, '[]'::jsonb))
       with ordinality as item(value, ordinality)
  where nullif(trim(item.value ->> 'word'), '') is not null;

  return saved_week_id;
end;
$$;

revoke all on function public.save_learning_week_content(uuid, integer, text, jsonb, jsonb) from public;
grant execute on function public.save_learning_week_content(uuid, integer, text, jsonb, jsonb) to authenticated;

