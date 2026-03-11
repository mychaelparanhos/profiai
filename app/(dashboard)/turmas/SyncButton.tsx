'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/classroom/sync');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erro ao sincronizar');
      } else {
        router.refresh();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sincronizando...' : 'Sincronizar Turmas'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
