'use client';
import { useState, useRef, useCallback } from 'react';

interface SlideUploaderProps {
  lessonId: string;
  classroomId: string;
  title: string;
  onUpload: (url: string, filename: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.pdf', '.pptx'];

export default function SlideUploader({ lessonId, classroomId, title, onUpload }: SlideUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Apenas arquivos PDF ou PPTX são permitidos.';
    }
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      return 'Tipo de arquivo inválido.';
    }
    if (file.size > MAX_SIZE) {
      return 'Arquivo muito grande. O limite é 50MB.';
    }
    return null;
  }

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setState('uploading');
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lessonId', lessonId);
    formData.append('classroomId', classroomId);
    formData.append('title', title);

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setState('success');
          setUploadedFile(file.name);
          onUpload(data.url, file.name);
        } else {
          let msg = 'Erro ao fazer upload.';
          try {
            const data = JSON.parse(xhr.responseText);
            msg = data.error ?? msg;
          } catch { /* */ }
          setState('error');
          setError(msg);
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        setState('error');
        setError('Erro de conexão. Tente novamente.');
        resolve();
      });

      xhr.open('POST', '/api/slides/upload');
      xhr.send(formData);
    });
  }, [lessonId, classroomId, title, onUpload]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleReset() {
    setState('idle');
    setProgress(0);
    setError(null);
    setUploadedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  if (state === 'success' && uploadedFile) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <div>
            <p className="text-sm font-medium text-green-800">{uploadedFile}</p>
            <p className="text-xs text-green-600">Upload concluído</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Substituir
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => state !== 'uploading' && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : state === 'uploading'
            ? 'border-gray-200 bg-gray-50 cursor-default'
            : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx"
          onChange={handleFileChange}
          className="hidden"
          disabled={state === 'uploading'}
        />

        {state === 'uploading' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enviando arquivo...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{progress}%</p>
          </div>
        ) : (
          <>
            <p className="text-2xl mb-2">📄</p>
            <p className="text-sm font-medium text-gray-700">
              Arraste o arquivo ou clique para selecionar
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF ou PPTX — máx. 50MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
