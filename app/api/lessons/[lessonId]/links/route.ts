import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/lessons/[lessonId]/links — lista links complementares da aula
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const { data: links, error } = await supabase
    .from('lesson_links')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: links ?? [] });
}

// POST /api/lessons/[lessonId]/links — adiciona link complementar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    title: string;
    url?: string;
    file_url?: string;
    description?: string;
    type?: 'url' | 'file';
  };

  if (!body.title) return NextResponse.json({ error: 'title é obrigatório' }, { status: 400 });
  if (body.type !== 'file' && !body.url) return NextResponse.json({ error: 'url é obrigatória' }, { status: 400 });

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

  const { data: link, error } = await supabase
    .from('lesson_links')
    .insert({
      lesson_id: lessonId,
      created_by: dbUser.id,
      title: body.title,
      url: body.url ?? null,
      file_url: body.file_url ?? null,
      description: body.description ?? null,
      type: body.type ?? 'url',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link }, { status: 201 });
}
