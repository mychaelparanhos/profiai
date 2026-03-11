import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import SyncButton from './SyncButton';

export default async function TurmasPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const supabase = createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user?.email ?? '')
    .single();

  const { data: classrooms } = dbUser
    ? await supabase
        .from('classrooms')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('name')
    : { data: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">Minhas Turmas</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {classrooms?.length ?? 0} turma(s) sincronizada(s)
          </p>
          <SyncButton />
        </div>

        {!classrooms?.length ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500">Nenhuma turma encontrada.</p>
            <p className="text-sm text-gray-400 mt-2">
              Clique em &ldquo;Sincronizar Turmas&rdquo; para importar suas turmas do Google Classroom.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800">{c.name}</h3>
                {c.section && (
                  <p className="text-sm text-gray-500 mt-1">{c.section}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
