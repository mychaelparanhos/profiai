import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(
    'https://classroom.googleapis.com/v1/courses?teacherId=me',
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('Classroom API error:', err);
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 502 });
  }

  const { courses = [] }: { courses: GoogleCourse[] } = await response.json();
  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const classroomsToUpsert = courses.map((c) => ({
    user_id: dbUser.id,
    google_classroom_id: c.id,
    name: c.name,
    section: c.section ?? null,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('classrooms')
    .upsert(classroomsToUpsert, { onConflict: 'user_id,google_classroom_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: classroomsToUpsert.length });
}
