-- Policies para leitura de conteúdo publicado por alunos autenticados
-- As APIs usam service role; estas policies são defesa em profundidade

-- Aulas publicadas são visíveis a qualquer autenticado
CREATE POLICY "lessons_published_readable" ON lessons
  FOR SELECT USING (status = 'published');

-- Outputs publicados são visíveis a qualquer autenticado
CREATE POLICY "lesson_outputs_published_readable" ON lesson_outputs
  FOR SELECT USING (published_at IS NOT NULL);
