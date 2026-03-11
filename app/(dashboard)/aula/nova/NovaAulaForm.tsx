'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClassroomSelector from '@/components/ClassroomSelector';
import SlideUploader from '@/components/SlideUploader';

interface Classroom {
  id: string;
  name: string;
  section?: string | null;
  google_classroom_id: string;
}

interface NovaAulaFormProps {
  classrooms: Classroom[];
}

function generateUUID(): string {
  return crypto.randomUUID();
}

export default function NovaAulaForm({ classrooms }: NovaAulaFormProps) {
  const router = useRouter();
  const [lessonId] = useState(() => generateUUID());
  const [title, setTitle] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [slidesUrl, setSlidesUrl] = useState<string | null>(null);
  const [slidesFilename, setSlidesFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReadyForUpload = title.trim().length > 0 && classroomId.length > 0;

  function handleUpload(url: string, filename: string) {
    setSlidesUrl(url);
    setSlidesFilename(filename);
    setError(null);
  }

  function handleProceed() {
    if (!slidesUrl) {
      setError('Faça o upload dos slides antes de continuar.');
      return;
    }
    // Redirecionar para a página de gravação de áudio
    router.push(`/aula/${lessonId}/gravar`);
  }

  return (
    <div className="space-y-6">
      {/* Título da aula */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Título da aula
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Aula 3 — Revolução Industrial"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Turma */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Turma
        </label>
        {classrooms.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma turma sincronizada.{' '}
            <a href="/turmas" className="text-indigo-600 underline">
              Sincronizar turmas
            </a>
          </p>
        ) : (
          <ClassroomSelector
            classrooms={classrooms}
            value={classroomId}
            onSelect={setClassroomId}
          />
        )}
      </div>

      {/* Upload de slides */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slides da aula
        </label>
        {!isReadyForUpload ? (
          <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            Preencha o título e selecione a turma para habilitar o upload.
          </p>
        ) : (
          <SlideUploader
            lessonId={lessonId}
            classroomId={classroomId}
            title={title}
            onUpload={handleUpload}
          />
        )}
      </div>

      {/* Status do upload */}
      {slidesFilename && (
        <p className="text-xs text-green-600">
          Slides carregados: <strong>{slidesFilename}</strong>
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Botão continuar */}
      <div className="pt-2">
        <button
          onClick={handleProceed}
          disabled={!slidesUrl}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continuar para gravação de áudio →
        </button>
      </div>
    </div>
  );
}
