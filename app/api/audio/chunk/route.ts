import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/audio/chunk — salva um chunk de áudio durante a gravação
// Chunks ficam em: audio-temp/{userId}/{lessonId}/chunks/chunk_{n}.webm
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const chunk = formData.get('chunk') as File | null;
  const lessonId = formData.get('lessonId') as string | null;
  const chunkIndex = formData.get('chunkIndex') as string | null;
  const mimeType = (formData.get('mimeType') as string | null) ?? 'audio/webm';

  if (!chunk || !lessonId || chunkIndex === null) {
    return NextResponse.json({ error: 'chunk, lessonId e chunkIndex são obrigatórios' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Verificar ownership da aula
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const storagePath = `${dbUser.id}/${lessonId}/chunks/chunk_${chunkIndex}.${ext}`;
  const arrayBuffer = await chunk.arrayBuffer();

  const { error } = await supabase.storage
    .from('audio-temp')
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, chunkIndex: Number(chunkIndex) });
}
