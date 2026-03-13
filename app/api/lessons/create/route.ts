import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/lessons/create — cria aula sem slides (modo "inserir depois" ou "sem slides")
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { lessonId: string; classroomId: string; title: string };
  const { lessonId, classroomId, title } = body;

  if (!lessonId || !classroomId || !title) {
    return NextResponse.json(
      { error: 'lessonId, classroomId e title são obrigatórios' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { error: dbError } = await supabase.from('lessons').upsert(
    {
      id: lessonId,
      user_id: dbUser.id,
      classroom_id: classroomId,
      title: title.trim(),
      slides_url: null,
      status: 'uploading',
    },
    { onConflict: 'id' }
  );

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ lessonId });
}
