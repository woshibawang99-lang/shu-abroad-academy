-- Read-only diagnostic report for teacher content permissions.

select
  'teachers_and_courses' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'teacher_name', p.full_name,
        'teacher_email', u.email,
        'teacher_user_id', p.id,
        'course_title', c.title,
        'course_teacher_id', c.teacher_id,
        'ids_match', c.teacher_id = p.id
      ) order by p.full_name, c.title
    ) filter (where p.id is not null),
    '[]'::jsonb
  ) as details
from public.profiles p
join auth.users u on u.id = p.id
left join public.courses c on c.teacher_id = p.id
where p.role = 'teacher'

union all

select
  'content_policies' as check_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table', tablename,
        'policy', policyname,
        'permissive', permissive,
        'roles', roles,
        'command', cmd,
        'using', qual,
        'with_check', with_check
      ) order by tablename, policyname
    ),
    '[]'::jsonb
  ) as details
from pg_policies
where schemaname = 'public'
  and tablename in ('course_weeks', 'slides', 'vocabulary');

