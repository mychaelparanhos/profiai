import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { after } from 'next/server';
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

  // Marcar como finalizando e retornar imediatamente — concatenação em background
  await supabase
    .from('lessons')
    .update({ status: 'finalizing' })
    .eq('id', lessonId)
    .eq('user_id', dbUser.id);

  after(async () => {
    try {
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
      const chunkBuffers = results.filter((b) => b !== null) as Uint8Array<ArrayBuffer>[];

      if (chunkBuffers.length === 0) {
        await supabase.from('lessons').update({ status: 'error', error_message: 'Nenhum chunk encontrado' }).eq('id', lessonId);
        return;
      }

      // Concatenar buffers
      const totalSize = chunkBuffers.reduce((acc, b) => acc + b.byteLength, 0);
      const merged = new Uint8Array(totalSize);
      let offset = 0;
      for (const buf of chunkBuffers) { merged.set(buf, offset); offset += buf.byteLength; }

      // Upload do arquivo final
      const finalPath = `${dbUser.id}/${lessonId}/audio.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('audio-temp')
        .upload(finalPath, merged, { contentType: mimeType, upsert: true });

      if (uploadError) {
        await supabase.from('lessons').update({ status: 'error', error_message: uploadError.message }).eq('id', lessonId);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('audio-temp').getPublicUrl(finalPath);

      await supabase
        .from('lessons')
        .update({ audio_url: publicUrl, status: 'pending' })
        .eq('id', lessonId);

      void cleanupChunks(supabase, dbUser.id, lessonId, totalChunks, ext);
    } catch (err) {
      console.error('[finalize] erro no background:', err);
      await supabase.from('lessons').update({ status: 'error', error_message: String(err) }).eq('id', lessonId);
    }
  });

  return NextResponse.json({ queued: true, lessonId });
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
