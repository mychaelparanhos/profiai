-- classroom_enrollments: vínculo aluno ↔ turma (populado via sync do Google Classroom)
-- Evita chamadas à Classroom API em toda request do aluno
CREATE TABLE IF NOT EXISTS classroom_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_student_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON classroom_enrollments(student_user_id);

ALTER TABLE classroom_enrollments ENABLE ROW LEVEL SECURITY;

-- Professor vê matrículas das próprias turmas
CREATE POLICY "enrollments_professor_read" ON classroom_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = classroom_enrollments.classroom_id
        AND classrooms.user_id = auth.uid()
    )
  );

-- Aluno vê as próprias matrículas
CREATE POLICY "enrollments_student_own" ON classroom_enrollments
  FOR SELECT USING (student_user_id = auth.uid());
