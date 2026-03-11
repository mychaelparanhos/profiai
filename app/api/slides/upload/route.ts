import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const lessonId = formData.get('lessonId') as string | null;
  const classroomId = formData.get('classroomId') as string | null;
  const title = formData.get('title') as string | null;

  if (!file || !lessonId || !classroomId || !title) {
    return NextResponse.json(
      { error: 'file, lessonId, classroomId e title são obrigatórios' },
      { status: 400 }
    );
  }

  // Validate MIME type on server
  const mimeBase = file.type.split(';')[0];
  if (!ALLOWED_TYPES.includes(mimeBase)) {
    return NextResponse.json(
      { error: 'Tipo inválido. Apenas PDF e PPTX.' },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Máx 50MB.' },
      { status: 422 }
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

  // Sanitize filename to avoid path traversal
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${dbUser.id}/${lessonId}/${safeFilename}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from('slides')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('slides')
    .getPublicUrl(storagePath);

  const { error: dbError } = await supabase.from('lessons').upsert(
    {
      id: lessonId,
      user_id: dbUser.id,
      classroom_id: classroomId,
      title: title.trim(),
      slides_url: publicUrl,
      status: 'uploading',
    },
    { onConflict: 'id' }
  );

  if (dbError) {
    // Best-effort cleanup of uploaded file
    await supabase.storage.from('slides').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, lessonId });
}
