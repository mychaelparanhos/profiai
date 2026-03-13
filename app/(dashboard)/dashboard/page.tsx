import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase';

async function getDashboardData(email: string) {
  const supabase = createServerSupabaseClient();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!dbUser) return { credits: 0, creditsUsed: 0, lessonCount: 0, classroomCount: 0, lessons: [] };

  const [subResult, lessonsResult, classroomsResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('credits_total, credits_used')
      .eq('user_id', dbUser.id)
      .single(),
    supabase
      .from('lessons')
      .select('id, title, status, recorded_at')
      .eq('user_id', dbUser.id)
      .not('status', 'in', '("uploading")')
      .order('recorded_at', { ascending: false })
      .limit(5),
    supabase
      .from('classrooms')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUser.id),
  ]);

  const creditsTotal = subResult.data?.credits_total ?? 0;
  const creditsUsed = subResult.data?.credits_used ?? 0;

  return {
    credits: creditsTotal - creditsUsed,
    lessonCount: lessonsResult.data?.length ?? 0,
    classroomCount: classroomsResult.count ?? 0,
    lessons: lessonsResult.data ?? [],
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ready: { label: 'Pronta', color: 'text-green-600 bg-green-50' },
  published: { label: 'Publicada', color: 'text-blue-600 bg-blue-50' },
  error: { label: 'Erro', color: 'text-red-600 bg-red-50' },
  transcribing: { label: 'Transcrevendo', color: 'text-yellow-600 bg-yellow-50' },
  processing: { label: 'Processando', color: 'text-yellow-600 bg-yellow-50' },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const data = await getDashboardData(session.user?.email ?? '');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">ProfIA</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user?.name}</span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-800 text-center">
            Bem-vindo, {session.user?.name?.split(' ')[0]}!
          </h2>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{data.credits}</p>
              <p className="text-xs text-gray-500 mt-1">Créditos</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{data.lessonCount}</p>
              <p className="text-xs text-gray-500 mt-1">Aulas</p>
            </div>
            <Link href="/turmas" className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors">
              <p className="text-2xl font-bold text-orange-600">{data.classroomCount}</p>
              <p className="text-xs text-gray-500 mt-1">Turmas</p>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/aula/nova"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + Nova Aula
            </Link>
            <Link
              href="/turmas"
              className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Gerenciar Turmas
            </Link>
          </div>
        </div>

        {/* Recent lessons */}
        {data.lessons.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Aulas recentes</h3>
            <ul className="divide-y divide-gray-100">
              {data.lessons.map((lesson) => {
                const s = STATUS_LABELS[lesson.status] ?? { label: lesson.status, color: 'text-gray-500 bg-gray-50' };
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/aula/${lesson.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-gray-800 font-medium truncate">{lesson.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 shrink-0 ${s.color}`}>
                        {s.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
