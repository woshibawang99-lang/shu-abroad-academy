-- Read-only inspection for quizzes, exams, submissions and grading.
select
  table_name,
  ordinal_position as position,
  column_name,
  udt_name as type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'assessments',
    'questions',
    'question_keys',
    'assessment_submissions',
    'student_answers',
    'submission_grades',
    'answer_grades'
  )
order by table_name, ordinal_position;
