'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AudioRecorder from '@/components/AudioRecorder';

type PageState = 'recording' | 'done' | 'error';

export default function GravarAulaPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [pageState, setPageState] = useState<PageState>('recording');
  const [error, setError] = useState<string | null>(null);

  function handleReady(_audioUrl: string) {
    setPageState('done');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/aula/nova" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Nova Aula
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800">Gravar Áudio</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          {/* Steps */}
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</span>
              Slides
            </span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
              <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold">2</span>
              Áudio
            </span>
            <span className="text-gray-300">→</span>
            <span className="text-gray-400">Processar</span>
          </div>

          <h2 className="text-xl font-bold text-gray-800">Grave a explicação da aula</h2>
          <p className="text-sm text-gray-500">
            Explique o conteúdo dos slides em voz alta. O áudio é salvo automaticamente em partes — você pode fechar o computador após parar a gravação.
          </p>

          {pageState === 'recording' && (
            <AudioRecorder lessonId={lessonId} onReady={handleReady} />
          )}

          {pageState === 'done' && (
            <div className="space-y-6">
              <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-green-800 font-medium">Áudio enviado com sucesso!</p>
                <p className="text-sm text-green-600 mt-1">
                  Seus slides e áudio estão prontos. Clique abaixo para processar com IA.
                </p>
              </div>
              <button
                onClick={() => router.push(`/aula/${lessonId}/processar`)}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Processar com IA →
              </button>
            </div>
          )}

          {pageState === 'error' && (
            <div className="space-y-4">
              <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => { setPageState('recording'); setError(null); }}
                className="text-sm text-indigo-600 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
