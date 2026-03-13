-- Adiciona coluna transcription_summary na tabela lesson_outputs
-- (versão limpa e editada da transcrição, distinta do summary executivo)
ALTER TABLE lesson_outputs ADD COLUMN IF NOT EXISTS transcription_summary TEXT;
