export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — requires Vercel Pro plan

import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { transcribeAudio } from '@/lib/whisper';
import { extractSlidesText } from '@/lib/slides';
import { generateLessonOutputs } from '@/lib/claude';
import { NextRequest, NextResponse } from 'next/server';

async function downloadFromStorage(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  bucket: string,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Resolve user
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch lesson
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, user_id, classroom_id, title, audio_url, slides_url, duration_secs, status')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  if (!lesson.audio_url) {
    return NextResponse.json({ error: 'Áudio ainda não enviado' }, { status: 400 });
  }

  // Check credits
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('credits_total, credits_used')
    .eq('user_id', dbUser.id)
    .single();

  if (!subscription || subscription.credits_used >= subscription.credits_total) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 });
  }

  // Fetch classroom name
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name')
    .eq('id', lesson.classroom_id)
    .single();

  const classroomName = classroom?.name ?? 'Aula';
  const durationMin = Math.ceil((lesson.duration_secs ?? 60) / 60);

  const setStatus = async (status: string, errorMessage?: string) => {
    await supabase
      .from('lessons')
      .update({ status, ...(errorMessage ? { error_message: errorMessage } : {}) })
      .eq('id', lessonId);
  };

  console.log('[pipeline] START lessonId:', lessonId, '| OPENAI_KEY set:', !!process.env.OPENAI_API_KEY, '| ANTHROPIC_KEY set:', !!process.env.ANTHROPIC_API_KEY);

  try {
    // ── Step 1: Transcribe audio (or reuse cached transcription) ──────
    await setStatus('transcribing');

    // Check for existing transcription from the same audio
    const { data: existingOutput } = await supabase
      .from('lesson_outputs')
      .select('transcription, audio_url')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const cachedAudioUrl = existingOutput?.audio_url as string | null | undefined;
    const cachedTranscription = existingOutput?.transcription as string | null | undefined;
    const canReuseTranscription =
      cachedTranscription &&
      cachedAudioUrl &&
      cachedAudioUrl === lesson.audio_url;

    let transcription: string;

    if (canReuseTranscription) {
      console.log('[pipeline] step 1: reusing cached transcription (same audio_url)');
      transcription = cachedTranscription!;
    } else {
      console.log('[pipeline] step 1: transcribing audio via Whisper');
      const audioUrl = new URL(lesson.audio_url);
      const audioPathMatch = audioUrl.pathname.match(/audio-temp\/(.+)$/);
      if (!audioPathMatch) throw new Error('Invalid audio URL format');

      const audioBuffer = await downloadFromStorage(supabase, 'audio-temp', audioPathMatch[1]);
      const mimeType = lesson.audio_url.includes('.mp4') ? 'audio/mp4' : 'audio/webm';
      transcription = await transcribeAudio(audioBuffer, mimeType);
    }

    // ── Step 2: Extract slides text ───────────────────────────────────
    await setStatus('processing');

    let slidesText = '';
    if (lesson.slides_url) {
      try {
        const slidesUrl = new URL(lesson.slides_url);
        const slidesPathMatch = slidesUrl.pathname.match(/slides\/(.+)$/);
        if (slidesPathMatch) {
          const slidesBuffer = await downloadFromStorage(supabase, 'slides', slidesPathMatch[1]);
          const slidesMime = lesson.slides_url.includes('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          slidesText = await extractSlidesText(slidesBuffer, slidesMime);
        }
      } catch (slidesErr) {
        console.warn('[pipeline] slides extraction failed (continuing without):', slidesErr);
      }
    }

    // ── Step 3: Generate outputs with Claude ──────────────────────────
    const outputs = await generateLessonOutputs(
      transcription,
      slidesText,
      classroomName,
      durationMin
    );

    // ── Step 4: Save outputs ──────────────────────────────────────────
    const { error: upsertError } = await supabase.from('lesson_outputs').upsert(
      {
        lesson_id: lessonId,
        audio_url: lesson.audio_url,
        transcription,
        summary: outputs.summary,
        quiz: outputs.quiz,
        references: outputs.references,
        transcription_summary: outputs.transcription_summary,
        next_class_suggestions: outputs.next_class_suggestions,
      },
      { onConflict: 'lesson_id' }
    );

    if (upsertError) throw new Error(`Failed to save outputs: ${upsertError.message}`);

    // ── Step 5: Decrement credit ──────────────────────────────────────
    await supabase
      .from('subscriptions')
      .update({ credits_used: subscription.credits_used + 1 })
      .eq('user_id', dbUser.id);

    // ── Step 6: Mark ready ────────────────────────────────────────────
    await setStatus('ready');

    return NextResponse.json({ lessonId, status: 'ready' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido no pipeline';
    console.error('[pipeline] ERROR:', msg, err);
    await setStatus('error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
