'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'finalizing' | 'done' | 'error';

interface AudioRecorderProps {
  lessonId: string;
  onReady: (audioUrl: string) => void;
}

const MAX_DURATION_SECS = 120 * 60;
const CHUNK_INTERVAL_MS = 30_000;

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) ?? 'audio/webm';
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getMicError(name: string): string {
  if (name === 'NotAllowedError') return 'Permissão negada. Habilite o microfone nas configurações do navegador.';
  if (name === 'NotFoundError') return 'Nenhum microfone encontrado.';
  if (name === 'NotReadableError') return 'Microfone em uso por outro aplicativo.';
  return `Erro ao acessar microfone (${name}).`;
}

export default function AudioRecorder({ lessonId, onReady }: AudioRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedChunks, setSavedChunks] = useState(0);
  const [savingChunk, setSavingChunk] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const chunkIndexRef = useRef(0);
  const pendingUploadsRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => {
    async function requestMic() {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setErrorMsg(getMicError(err instanceof DOMException ? err.name : 'Unknown'));
        setRecorderState('error');
      }
    }
    requestMic();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { return () => { stopTimer(); stopStream(); }; }, [stopTimer, stopStream]);

  async function uploadChunk(chunkBlob: Blob, index: number) {
    setSavingChunk(true);
    pendingUploadsRef.current += 1;
    try {
      const formData = new FormData();
      const ext = mimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm';
      formData.append('chunk', chunkBlob, `chunk_${index}.${ext}`);
      formData.append('lessonId', lessonId);
      formData.append('chunkIndex', String(index));
      formData.append('mimeType', mimeTypeRef.current);
      const res = await fetch('/api/audio/chunk', { method: 'POST', body: formData });
      if (res.ok) setSavedChunks((prev) => prev + 1);
    } catch { /* silencioso */ } finally {
      pendingUploadsRef.current -= 1;
      if (pendingUploadsRef.current === 0) setSavingChunk(false);
    }
  }

  async function finalizeRecording(totalChunks: number) {
    setRecorderState('finalizing');
    let waited = 0;
    while (pendingUploadsRef.current > 0 && waited < 30_000) {
      await new Promise((r) => setTimeout(r, 500));
      waited += 500;
    }
    try {
      const res = await fetch('/api/audio/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, totalChunks, mimeType: mimeTypeRef.current }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Erro ao finalizar');
      }
      const data = await res.json() as { audioUrl: string };
      setRecorderState('done');
      onReady(data.audioUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao finalizar');
      setRecorderState('error');
    }
  }

  async function handleRecord() {
    setErrorMsg(null);
    setRecorderState('requesting');
    chunkIndexRef.current = 0;
    setSavedChunks(0);
    try {
      if (!streamRef.current?.active) streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(streamRef.current!, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) uploadChunk(e.data, chunkIndexRef.current++); };
      recorder.onstop = () => { stopStream(); finalizeRecording(chunkIndexRef.current); };
      recorder.start(CHUNK_INTERVAL_MS);
      setRecorderState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECS) { stopTimer(); recorder.stop(); }
          return next;
        });
      }, 1000);
    } catch (err) {
      setErrorMsg(getMicError(err instanceof DOMException ? err.name : 'Unknown'));
      setRecorderState('error');
    }
  }

  function handlePause() { mediaRecorderRef.current?.pause(); stopTimer(); setRecorderState('paused'); }
  function handleResume() {
    mediaRecorderRef.current?.resume();
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    setRecorderState('recording');
  }
  function handleStop() { stopTimer(); mediaRecorderRef.current?.requestData(); mediaRecorderRef.current?.stop(); setRecorderState('stopped'); }
  function handleReset() { setRecorderState('idle'); setElapsed(0); setErrorMsg(null); setSavedChunks(0); chunkIndexRef.current = 0; pendingUploadsRef.current = 0; }

  const safeMins = Math.round(savedChunks * (CHUNK_INTERVAL_MS / 60_000));

  return (
    <div className="border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-center gap-4">
        {(recorderState === 'recording' || recorderState === 'paused') && (
          <span className={`w-3 h-3 rounded-full ${recorderState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`} />
        )}
        <span className={`font-mono text-3xl font-bold ${recorderState === 'idle' ? 'text-gray-300' : 'text-gray-800'}`}>{formatTime(elapsed)}</span>
        {elapsed > 0 && <span className="text-xs text-gray-400">/ {formatTime(MAX_DURATION_SECS)}</span>}
      </div>

      <p className="text-center text-sm text-gray-500">
        {recorderState === 'idle' && 'Clique em Gravar para começar'}
        {recorderState === 'requesting' && 'Solicitando acesso ao microfone...'}
        {recorderState === 'recording' && 'Gravando...'}
        {recorderState === 'paused' && 'Gravação pausada'}
        {recorderState === 'stopped' && 'Encerrando gravação...'}
        {recorderState === 'finalizing' && 'Montando arquivo final...'}
        {recorderState === 'done' && 'Áudio salvo com sucesso!'}
        {recorderState === 'error' && 'Erro na gravação'}
      </p>

      {(recorderState === 'recording' || recorderState === 'paused') && (
        <div className="text-center text-xs">
          {savingChunk ? (
            <span className="text-indigo-500 animate-pulse">💾 Salvando parte...</span>
          ) : savedChunks > 0 ? (
            <span className="text-green-600">✓ {safeMins} min de áudio seguro ({savedChunks} parte{savedChunks !== 1 ? 's' : ''} salva{savedChunks !== 1 ? 's' : ''})</span>
          ) : (
            <span className="text-gray-400">Primeira parte será salva em {CHUNK_INTERVAL_MS / 1000}s...</span>
          )}
        </div>
      )}

      {(recorderState === 'recording' || recorderState === 'paused') && savedChunks > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 text-center">
          O áudio está sendo salvo automaticamente. Pode fechar o computador com segurança.
        </div>
      )}

      {recorderState === 'finalizing' && (
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600">Aguarde...</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {(recorderState === 'idle' || recorderState === 'error') && (
          <button onClick={handleRecord} className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-red-600 transition-colors">⏺ Gravar</button>
        )}
        {recorderState === 'requesting' && (
          <button disabled className="bg-gray-200 text-gray-400 px-5 py-2.5 rounded-full text-sm cursor-not-allowed">Aguardando...</button>
        )}
        {recorderState === 'recording' && (
          <>
            <button onClick={handlePause} className="flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-yellow-500 transition-colors">⏸ Pausar</button>
            <button onClick={handleStop} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors">⏹ Parar</button>
          </>
        )}
        {recorderState === 'paused' && (
          <>
            <button onClick={handleResume} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-green-600 transition-colors">▶ Retomar</button>
            <button onClick={handleStop} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors">⏹ Parar</button>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-2">
          <p className="text-xs text-red-700">{errorMsg}</p>
          <button onClick={handleReset} className="text-xs text-indigo-600 underline">Tentar novamente</button>
        </div>
      )}
    </div>
  );
}
