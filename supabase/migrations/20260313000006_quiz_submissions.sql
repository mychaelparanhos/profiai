-- google_coursework_id: ID da tarefa criada no Google Classroom para o quiz
ALTER TABLE lesson_outputs
  ADD COLUMN IF NOT EXISTS google_coursework_id TEXT;

-- quiz_submissions: respostas e notas dos alunos
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,           -- { "0": "A", "1": "C", ... }
  score NUMERIC(5,2) NOT NULL,      -- 0.00 a 100.00
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  google_submission_id TEXT,        -- ID retornado pela Classroom API após post de nota
  UNIQUE(lesson_id, student_user_id) -- uma submissão por aluno por aula
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson ON quiz_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_user_id);

ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Aluno gerencia a própria submissão
CREATE POLICY "quiz_submissions_student_own" ON quiz_submissions
  FOR ALL USING (student_user_id = auth.uid());

-- Professor lê submissões das próprias aulas
CREATE POLICY "quiz_submissions_professor_read" ON quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = quiz_submissions.lesson_id
        AND lessons.user_id = auth.uid()
    )
  );
