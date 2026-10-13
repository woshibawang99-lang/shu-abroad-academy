-- Read-only inspection: this query does not change any data.
select
  table_name,
  string_agg(
    column_name || ' (' || udt_name || ')',
    ', '
    order by ordinal_position
  ) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'courses',
    'course_enrollments',
    'course_weeks',
    'slides',
    'vocabulary',
    'assessments',
    'questions',
    'question_keys',
    'assessment_submissions',
    'student_answers',
    'submission_grades',
    'answer_grades'
  )
group by table_name
order by table_name;
