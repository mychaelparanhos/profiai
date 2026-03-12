import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = (session as { accessToken?: string }).accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Token do Google não encontrado. Faça login novamente.' },
      { status: 401 }
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

  // Fetch lesson + outputs + classroom
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, classroom_id, status')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  if (lesson.status !== 'ready') {
    return NextResponse.json(
      { error: 'Aula ainda não processada' },
      { status: 400 }
    );
  }

  const { data: outputs } = await supabase
    .from('lesson_outputs')
    .select('id, summary, google_post_id')
    .eq('lesson_id', lessonId)
    .single();

  if (!outputs) {
    return NextResponse.json({ error: 'Outputs não encontrados' }, { status: 404 });
  }

  // Idempotency — already published
  if (outputs.google_post_id) {
    return NextResponse.json({ postId: outputs.google_post_id, alreadyPublished: true });
  }

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('google_classroom_id, name')
    .eq('id', lesson.classroom_id)
    .single();

  if (!classroom) {
    return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
  }

  const date = new Date().toLocaleDateString('pt-BR');
  const text = `📚 Material da Aula — ${lesson.title} (${date})\n\n${outputs.summary ?? ''}`;

  const classroomRes = await fetch(
    `https://classroom.googleapis.com/v1/courses/${classroom.google_classroom_id}/announcements`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, state: 'PUBLISHED' }),
    }
  );

  if (!classroomRes.ok) {
    const errBody = await classroomRes.text();
    return NextResponse.json(
      { error: `Erro ao publicar no Classroom: ${errBody}` },
      { status: classroomRes.status }
    );
  }

  const post = (await classroomRes.json()) as { id: string };

  await supabase
    .from('lesson_outputs')
    .update({
      google_post_id: post.id,
      published_at: new Date().toISOString(),
    })
    .eq('id', outputs.id);

  await supabase
    .from('lessons')
    .update({ status: 'published' })
    .eq('id', lessonId);

  return NextResponse.json({ postId: post.id });
}
