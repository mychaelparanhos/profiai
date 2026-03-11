'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

interface AudioRecorderProps {
  onRecorded: (blob: Blob, mimeType: string) => void;
}

const MAX_DURATION_SECS = 120 * 60; // 120 minutos

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((t) => {
    try { return MediaRecorder.isTypeSupported(t); }
    catch { return false; }
  }) ?? 'audio/webm';
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleAutoStop = useCallback(() => {
    stopTimer();
    setErrorMsg('Limite de 120 minutos atingido. Gravação encerrada automaticamente.');
    stopRecorder();
    setRecorderState('stopped');
  }, [stopTimer, stopRecorder]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_DURATION_SECS) {
          handleAutoStop();
        }
        return next;
      });
    }, 1000);
  }, [handleAutoStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
    };
  }, [stopTimer, stopStream]);


  async function handleRecord() {
    setErrorMsg(null);
    setRecorderState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];
        stopStream();
        onRecorded(blob, mimeTypeRef.current);
      };

      recorder.start(1000);
      setRecorderState('recording');
      setElapsed(0);
      startTimer();
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permissão de microfone negada. Habilite o acesso ao microfone nas configurações do navegador e tente novamente.'
          : 'Não foi possível acessar o microfone. Verifique seu dispositivo.';
      setErrorMsg(msg);
      setRecorderState('error');
    }
  }

  function handlePause() {
    if (mediaRecorderRef.current) mediaRecorderRef.current.pause();
    stopTimer();
    setRecorderState('paused');
  }

  function handleResume() {
    if (mediaRecorderRef.current) mediaRecorderRef.current.resume();
    startTimer();
    setRecorderState('recording');
  }

  function handleStop() {
    stopTimer();
    stopRecorder();
    setRecorderState('stopped');
  }

  function handleReset() {
    setRecorderState('idle');
    setElapsed(0);
    setErrorMsg(null);
    chunksRef.current = [];
  }

  return (
    <div className="border border-gray-200 rounded-xl p-6 space-y-5">
      {/* Timer + pulse indicator */}
      <div className="flex items-center justify-center gap-4">
        {(recorderState === 'recording' || recorderState === 'paused') && (
          <span
            className={`w-3 h-3 rounded-full ${
              recorderState === 'recording'
                ? 'bg-red-500 animate-pulse'
                : 'bg-yellow-400'
            }`}
          />
        )}
        <span
          className={`font-mono text-3xl font-bold ${
            recorderState === 'idle' ? 'text-gray-300' : 'text-gray-800'
          }`}
        >
          {formatTime(elapsed)}
        </span>
        {elapsed > 0 && (
          <span className="text-xs text-gray-400">/ {formatTime(MAX_DURATION_SECS)}</span>
        )}
      </div>

      {/* Status label */}
      <p className="text-center text-sm text-gray-500">
        {recorderState === 'idle' && 'Clique em Gravar para começar'}
        {recorderState === 'requesting' && 'Solicitando acesso ao microfone...'}
        {recorderState === 'recording' && 'Gravando...'}
        {recorderState === 'paused' && 'Gravação pausada'}
        {recorderState === 'stopped' && 'Gravação concluída'}
        {recorderState === 'error' && 'Erro ao acessar microfone'}
      </p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {(recorderState === 'idle' || recorderState === 'error') && (
          <button
            onClick={handleRecord}
            className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <span>⏺</span> Gravar
          </button>
        )}

        {recorderState === 'requesting' && (
          <button
            disabled
            className="bg-gray-200 text-gray-400 px-5 py-2.5 rounded-full text-sm cursor-not-allowed"
          >
            Aguardando...
          </button>
        )}

        {recorderState === 'recording' && (
          <>
            <button
              onClick={handlePause}
              className="flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-yellow-500 transition-colors"
            >
              <span>⏸</span> Pausar
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <span>⏹</span> Parar
            </button>
          </>
        )}

        {recorderState === 'paused' && (
          <>
            <button
              onClick={handleResume}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <span>▶</span> Retomar
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <span>⏹</span> Parar
            </button>
          </>
        )}

        {recorderState === 'stopped' && (
          <button
            onClick={handleReset}
            className="text-sm text-indigo-600 underline hover:text-indigo-800"
          >
            Gravar novamente
          </button>
        )}
      </div>

      {/* Error / warning messages */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs text-red-700">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
