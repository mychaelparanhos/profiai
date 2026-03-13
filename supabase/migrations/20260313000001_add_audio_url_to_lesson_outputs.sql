-- Add audio_url to lesson_outputs so we can verify which audio was transcribed
-- and safely reuse the transcription on retry without re-transcribing a different audio.
alter table lesson_outputs
  add column if not exists audio_url text;
