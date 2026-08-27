update public.quizzes q
set is_unlocked = 0
where q.status = 'published'
  and q.question_count <> (
    select count(*) from public.quiz_questions qq where qq.quiz_id = q.id
  );
