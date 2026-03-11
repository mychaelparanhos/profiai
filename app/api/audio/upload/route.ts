import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MIME_BASES = ['audio/webm', 'audio/mp4'];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('audio') as File | null;
  const lessonId = formData.get('lessonId') as string | null;

  if (!file || !lessonId) {
    return NextResponse.json(
      { error: 'audio e lessonId são obrigatórios' },
      { status: 400 }
    );
  }

  const mimeBase = file.type.split(';')[0];
  if (!ALLOWED_MIME_BASES.includes(mimeBase)) {
    return NextResponse.json(
      { error: 'Formato de áudio inválido. Apenas WebM ou MP4.' },
      { status: 422 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const ext = file.type.includes('mp4') ? 'mp4' : 'webm';
  const storagePath = `${dbUser.id}/${lessonId}/audio.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from('audio-temp')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('audio-temp')
    .getPublicUrl(storagePath);

  const { error: dbError } = await supabase
    .from('lessons')
    .update({ audio_url: publicUrl, status: 'processing' })
    .eq('id', lessonId)
    .eq('user_id', dbUser.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, lessonId });
}
