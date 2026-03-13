import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/audio/finalize — concatena os chunks e atualiza lessons.audio_url
// Body: { lessonId, totalChunks, mimeType }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { lessonId: string; totalChunks: number; mimeType: string };
  const { lessonId, totalChunks, mimeType = 'audio/webm' } = body;

  if (!lessonId || totalChunks === undefined) {
    return NextResponse.json({ error: 'lessonId e totalChunks são obrigatórios' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

  // Baixar todos os chunks em paralelo (mantém ordem)
  const results = await Promise.all(
    Array.from({ length: totalChunks }, async (_, i) => {
      const chunkPath = `${dbUser.id}/${lessonId}/chunks/chunk_${i}.${ext}`;
      const { data, error } = await supabase.storage.from('audio-temp').download(chunkPath);
      if (error || !data) {
        console.warn(`[finalize] chunk ${i} não encontrado, pulando`);
        return null;
      }
      return new Uint8Array(await data.arrayBuffer());
    })
  );
  const chunkBuffers = results.filter((b): b is Uint8Array => b !== null);

  if (chunkBuffers.length === 0) {
    return NextResponse.json({ error: 'Nenhum chunk encontrado' }, { status: 422 });
  }

  // Concatenar buffers
  const totalSize = chunkBuffers.reduce((acc, b) => acc + b.byteLength, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const buf of chunkBuffers) {
    merged.set(buf, offset);
    offset += buf.byteLength;
  }

  // Upload do arquivo final
  const finalPath = `${dbUser.id}/${lessonId}/audio.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('audio-temp')
    .upload(finalPath, merged, { contentType: mimeType, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from('audio-temp').getPublicUrl(finalPath);

  // Atualizar lesson com audio_url e status
  await supabase
    .from('lessons')
    .update({ audio_url: publicUrl, status: 'processing' })
    .eq('id', lessonId)
    .eq('user_id', dbUser.id);

  // Limpar chunks individuais em background (não bloqueia resposta)
  void cleanupChunks(supabase, dbUser.id, lessonId, totalChunks, ext);

  return NextResponse.json({ audioUrl: publicUrl, lessonId });
}

async function cleanupChunks(
  supabase: ReturnType<typeof import('@/lib/supabase').createServerSupabaseClient>,
  userId: string,
  lessonId: string,
  totalChunks: number,
  ext: string
) {
  const paths = Array.from({ length: totalChunks }, (_, i) =>
    `${userId}/${lessonId}/chunks/chunk_${i}.${ext}`
  );
  await supabase.storage.from('audio-temp').remove(paths);
}
