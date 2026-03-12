import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, status, error_message')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  return NextResponse.json({
    lesson_id: lesson.id,
    status: lesson.status,
    error_message: lesson.error_message ?? null,
  });
}
