'use client';
import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProcessarPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    // Trigger pipeline then redirect to lesson page (which polls status)
    fetch(`/api/lessons/${lessonId}/process`, { method: 'POST' })
      .catch(() => {
        // Pipeline errors are handled via status polling on the lesson page
      })
      .finally(() => {
        router.replace(`/aula/${lessonId}`);
      });
  }, [lessonId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-gray-600">Iniciando processamento com IA...</p>
      </div>
    </div>
  );
}
