import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">ProfIA</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user?.name}
            </span>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Bem-vindo, {session.user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="mt-2 text-gray-500">
            Seu dashboard está sendo construído. Sprint 1 em andamento.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">3</p>
              <p className="text-xs text-gray-500 mt-1">Créditos</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-xs text-gray-500 mt-1">Aulas</p>
            </div>
            <Link href="/turmas" className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition-colors">
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-xs text-gray-500 mt-1">Turmas</p>
            </Link>
          </div>
          <div className="mt-6">
            <Link
              href="/turmas"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Gerenciar Turmas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
