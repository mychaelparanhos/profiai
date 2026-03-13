-- Adiciona coluna audio_url na tabela lesson_outputs
ALTER TABLE lesson_outputs ADD COLUMN IF NOT EXISTS audio_url TEXT;
