-- Create audio-temp storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-temp',
  'audio-temp',
  false,
  524288000, -- 500MB
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
on conflict (id) do nothing;
