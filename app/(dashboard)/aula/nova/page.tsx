import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NovaAulaForm from './NovaAulaForm';

export default async function NovaAulaPage() {
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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800">Nova Aula</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Criar nova aula</h2>
          <NovaAulaForm classrooms={classrooms ?? []} />
        </div>
      </main>
    </div>
  );
}
