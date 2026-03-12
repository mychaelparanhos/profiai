'use client';
import { useState } from 'react';
import type { LessonOutput, QuizQuestion } from '@/types';

interface LessonOutputProps {
  outputs: LessonOutput;
  onPublish: () => Promise<void>;
  published: boolean;
  publishUrl?: string;
}

type Tab = 'resumo' | 'quiz' | 'referencias' | 'transcricao';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'referencias', label: 'Referências' },
  { id: 'transcricao', label: 'Transcrição' },
];

function QuizCard({ item, index }: { item: QuizQuestion; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-gray-800">
        {index + 1}. {item.question}
      </p>
      <ul className="space-y-1">
        {item.options.map((opt) => (
          <li
            key={opt}
            className={`text-xs px-3 py-1.5 rounded ${
              revealed && opt.startsWith(item.answer)
                ? 'bg-green-100 text-green-800 font-medium'
                : 'text-gray-600'
            }`}
          >
            {opt}
          </li>
        ))}
      </ul>
      {revealed && (
        <p className="text-xs text-gray-500 italic">💡 {item.explanation}</p>
      )}
      <button
        onClick={() => setRevealed((r) => !r)}
        className="text-xs text-indigo-600 underline"
      >
        {revealed ? 'Ocultar resposta' : 'Ver resposta'}
      </button>
    </div>
  );
}

export default function LessonOutput({
  outputs,
  onPublish,
  published,
  publishUrl,
}: LessonOutputProps) {
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      await onPublish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-64">
        {activeTab === 'resumo' && (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {outputs.summary ?? 'Resumo não disponível.'}
          </pre>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {outputs.quiz && outputs.quiz.length > 0 ? (
              outputs.quiz.map((item, i) => (
                <QuizCard key={i} item={item} index={i} />
              ))
            ) : (
              <p className="text-sm text-gray-500">Quiz não disponível.</p>
            )}
          </div>
        )}

        {activeTab === 'referencias' && (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {outputs.references ?? 'Referências não disponíveis.'}
          </pre>
        )}

        {activeTab === 'transcricao' && (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {outputs.transcription ?? 'Transcrição não disponível.'}
          </pre>
        )}
      </div>

      {/* Publish section */}
      <div className="border-t border-gray-100 pt-5">
        {published ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
              ✓ Publicado no Google Classroom
            </span>
            {publishUrl && (
              <a
                href={publishUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 underline"
              >
                Ver post →
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {publishing ? 'Publicando...' : '📢 Publicar no Google Classroom'}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
