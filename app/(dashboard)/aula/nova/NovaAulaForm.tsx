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

type SlidesMode = 'agora' | 'depois' | 'nao';

function generateUUID(): string {
  return crypto.randomUUID();
}

export default function NovaAulaForm({ classrooms }: NovaAulaFormProps) {
  const router = useRouter();
  const [lessonId] = useState(() => generateUUID());
  const [title, setTitle] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [slidesMode, setSlidesMode] = useState<SlidesMode>('agora');
  const [slidesUrl, setSlidesUrl] = useState<string | null>(null);
  const [slidesFilename, setSlidesFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadyForUpload = title.trim().length > 0 && classroomId.length > 0;

  const canProceed =
    isReadyForUpload &&
    (slidesMode !== 'agora' || slidesUrl !== null);

  function handleUpload(url: string, filename: string) {
    setSlidesUrl(url);
    setSlidesFilename(filename);
    setError(null);
  }

  async function handleProceed() {
    if (!canProceed) return;
    setLoading(true);
    setError(null);

    try {
      if (slidesMode !== 'agora') {
        // Criar aula sem slides via endpoint dedicado
        const res = await fetch('/api/lessons/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, classroomId, title }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Erro ao criar aula');
        }
      }

      const params = new URLSearchParams({ slides: slidesMode });
      if (slidesMode === 'depois') {
        params.set('cid', classroomId);
        params.set('t', title.trim());
      }
      router.push(`/aula/${lessonId}/gravar?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setLoading(false);
    }
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

      {/* Modo dos slides */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Material da aula (slides / PDF)
        </label>
        <div className="space-y-2">
          {(
            [
              { value: 'agora', label: 'Inserir agora', desc: 'Fazer upload antes de gravar' },
              { value: 'depois', label: 'Inserir depois', desc: 'Adicionar slides após a gravação' },
              { value: 'nao', label: 'Não usar slides', desc: 'Usar apenas a gravação de áudio' },
            ] as { value: SlidesMode; label: string; desc: string }[]
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                slidesMode === opt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="slidesMode"
                value={opt.value}
                checked={slidesMode === opt.value}
                onChange={() => {
                  setSlidesMode(opt.value);
                  if (opt.value !== 'agora') {
                    setSlidesUrl(null);
                    setSlidesFilename(null);
                  }
                }}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Upload de slides (apenas no modo "agora") */}
      {slidesMode === 'agora' && (
        <div>
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
          {slidesFilename && (
            <p className="text-xs text-green-600 mt-2">
              Slides carregados: <strong>{slidesFilename}</strong>
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Botão continuar */}
      <div className="pt-2">
        <button
          onClick={handleProceed}
          disabled={!canProceed || loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Aguarde...' : 'Continuar para gravação de áudio →'}
        </button>
      </div>
    </div>
  );
}
