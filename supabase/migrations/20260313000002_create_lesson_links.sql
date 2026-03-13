-- lesson_links: materiais complementares adicionados pelo professor antes de publicar
CREATE TABLE IF NOT EXISTS lesson_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  file_url TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'url' CHECK (type IN ('url', 'file')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_links_lesson_id ON lesson_links(lesson_id);

ALTER TABLE lesson_links ENABLE ROW LEVEL SECURITY;

-- Professor gerencia os próprios links
CREATE POLICY "lesson_links_professor_all" ON lesson_links
  FOR ALL USING (created_by = auth.uid());

-- Qualquer autenticado lê links de aulas publicadas
CREATE POLICY "lesson_links_published_read" ON lesson_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_outputs
      WHERE lesson_outputs.lesson_id = lesson_links.lesson_id
        AND lesson_outputs.published_at IS NOT NULL
    )
  );
