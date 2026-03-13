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
    .select('id, title, status, error_message')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  let outputs = null;
  if (lesson.status === 'ready' || lesson.status === 'published') {
    const { data } = await supabase
      .from('lesson_outputs')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();
    outputs = data;
  }

  // Links complementares (professor-curados)
  const { data: links } = await supabase
    .from('lesson_links')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return NextResponse.json({ ...lesson, outputs, links: links ?? [] });
}
