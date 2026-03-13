import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateLessonDocx } from '@/lib/document';
import { NextRequest, NextResponse } from 'next/server';
import type { LessonOutputs } from '@/lib/claude';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('email', session.user?.email ?? '').single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: lesson } = await supabase
    .from('lessons').select('title').eq('id', lessonId).eq('user_id', dbUser.id).single();
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  const { data: output } = await supabase
    .from('lesson_outputs')
    .select('summary, quiz, references, transcription_summary, next_class_suggestions')
    .eq('lesson_id', lessonId)
    .single();
  if (!output) return NextResponse.json({ error: 'Outputs not found' }, { status: 404 });

  const docxBuffer = await generateLessonDocx(lesson.title, output as LessonOutputs);

  const filename = `${lesson.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}.docx`;

  return new NextResponse(docxBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
