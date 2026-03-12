-- Criar bucket slides (público para acesso via URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slides',
  'slides',
  true,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket slides
CREATE POLICY "slides_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'slides' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "slides_read_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'slides');

CREATE POLICY "slides_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'slides' AND auth.uid()::text = (storage.foldername(name))[1]);
