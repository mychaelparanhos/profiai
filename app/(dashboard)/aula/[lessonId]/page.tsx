'use client';
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProcessingStatus from '@/components/ProcessingStatus';
import LessonOutput from '@/components/LessonOutput';
import AddLinkModal from '@/components/AddLinkModal';
import type { LessonOutput as LessonOutputType, LessonStatus, LessonLink } from '@/types';

interface LessonData {
  id: string;
  title: string;
  status: LessonStatus;
  error_message: string | null;
  outputs: LessonOutputType | null;
  links?: LessonLink[];
}

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | undefined>();
  const [links, setLinks] = useState<LessonLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);

  const refreshLesson = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/data`);
    if (!res.ok) {
      setError('Aula não encontrada');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as LessonData;
    setLesson(data);
    setLinks(data.links ?? []);
    if (data.outputs?.google_post_id) {
      setPublished(true);
    }
    setLoading(false);
  }, [lessonId]);

  useEffect(() => {
    // refreshLesson sets state asynchronously (after await), not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshLesson();
  }, [refreshLesson]);

  const handleReady = useCallback(() => {
    void refreshLesson();
  }, [refreshLesson]);

  async function handlePublish() {
    const res = await fetch(`/api/lessons/${lessonId}/publish`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json() as { error: string };
      throw new Error(data.error);
    }
    setPublished(true);
    const data = await res.json() as { postId: string };
    setPublishUrl(
      `https://classroom.google.com/c/${data.postId}`
    );
    setLesson((prev) => prev ? { ...prev, status: 'published' } : prev);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error ?? 'Erro desconhecido'}</p>
          <Link href="/dashboard" className="text-indigo-600 underline text-sm">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = !['ready', 'published', 'error'].includes(lesson.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800 truncate">{lesson.title}</h1>
          {lesson.status === 'published' && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Publicado
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {lesson.status === 'error' ? (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">Erro no processamento</p>
              <p className="text-sm text-gray-500">{lesson.error_message}</p>
              <Link
                href={`/aula/${lessonId}/processar`}
                className="text-sm text-indigo-600 underline"
              >
                Tentar novamente
              </Link>
            </div>
          ) : isProcessing ? (
            <ProcessingStatus
              lessonId={lessonId}
              onReady={handleReady}
              onError={(msg) => setError(msg)}
            />
          ) : lesson.outputs ? (
            <LessonOutput
              lessonId={lessonId}
              outputs={lesson.outputs}
              complementaryLinks={links}
              onAddLink={() => setShowAddLink(true)}
              onPublish={handlePublish}
              published={published}
              publishUrl={publishUrl}
            />
            {showAddLink && (
              <AddLinkModal
                lessonId={lessonId}
                onClose={() => setShowAddLink(false)}
                onAdded={() => void refreshLesson()}
              />
            )}
          ) : (
            <p className="text-gray-500 text-sm">Outputs não disponíveis.</p>
          )}
        </div>
      </main>
    </div>
  );
}
