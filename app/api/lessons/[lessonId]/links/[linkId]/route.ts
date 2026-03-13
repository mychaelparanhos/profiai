import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/lessons/[lessonId]/links/[linkId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; linkId: string }> }
) {
  const { lessonId, linkId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Verificar ownership via lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('user_id', dbUser.id)
    .single();

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  const { error } = await supabase
    .from('lesson_links')
    .delete()
    .eq('id', linkId)
    .eq('lesson_id', lessonId)
    .eq('created_by', dbUser.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
