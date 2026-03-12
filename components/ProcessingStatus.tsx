'use client';
import { useState, useEffect, useCallback } from 'react';
import type { LessonStatus } from '@/types';

interface ProcessingStatusProps {
  lessonId: string;
  onReady: () => void;
  onError?: (msg: string) => void;
}

const STEPS: { status: LessonStatus; label: string }[] = [
  { status: 'uploading', label: 'Enviando arquivos...' },
  { status: 'transcribing', label: 'Transcrevendo áudio...' },
  { status: 'processing', label: 'Gerando material com IA...' },
  { status: 'ready', label: 'Pronto!' },
];

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <span className="text-green-500 text-lg">✓</span>;
  if (active)
    return (
      <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin inline-block" />
    );
  return <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />;
}

export default function ProcessingStatus({
  lessonId,
  onReady,
  onError,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<LessonStatus>('uploading');

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/status`);
      if (!res.ok) return;
      const data = (await res.json()) as { status: LessonStatus; error_message?: string };
      setStatus(data.status);

      if (data.status === 'ready') {
        onReady();
      } else if (data.status === 'error') {
        onError?.(data.error_message ?? 'Erro no processamento');
      }
    } catch {
      // network error — keep polling
    }
  }, [lessonId, onReady, onError]);

  useEffect(() => {
    if (status === 'ready' || status === 'error') return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [status, poll]);

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="space-y-6 py-4">
      <p className="text-center text-gray-600 text-sm font-medium">
        Processando sua aula — isso leva cerca de 2-5 minutos
      </p>

      <ol className="space-y-4">
        {STEPS.map((step, idx) => {
          const done = currentIndex > idx;
          const active = currentIndex === idx;
          return (
            <li key={step.status} className="flex items-center gap-3">
              <span className="w-6 flex items-center justify-center flex-shrink-0">
                <StepIcon done={done} active={active} />
              </span>
              <span
                className={`text-sm ${
                  done
                    ? 'text-green-700'
                    : active
                    ? 'text-indigo-700 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(5, ((currentIndex + 1) / STEPS.length) * 100)}%` }}
        />
      </div>
    </div>
  );
}
