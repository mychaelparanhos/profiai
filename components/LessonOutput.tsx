'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { LessonOutput, LessonLink, QuizQuestion } from '@/types';
import QuizCardInteractive from './QuizCardInteractive';

interface LessonOutputProps {
  lessonId: string;
  outputs: LessonOutput;
  mode?: 'professor' | 'student';
  complementaryLinks?: LessonLink[];
  onAddLink?: () => void;
  onPublish?: () => Promise<void>;
  published?: boolean;
  publishUrl?: string;
}

type Tab = 'resumo' | 'quiz' | 'proxima' | 'referencias' | 'transcricao';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'resumo', label: 'Resumo', emoji: '📄' },
  { id: 'quiz', label: 'Quiz', emoji: '🧠' },
  { id: 'proxima', label: 'Próxima Aula', emoji: '🗓️' },
  { id: 'referencias', label: 'Referências', emoji: '📚' },
  { id: 'transcricao', label: 'Transcrição', emoji: '🎙️' },
];

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-gray max-w-none
      prose-headings:font-semibold prose-headings:text-gray-800
      prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2
      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-li:text-gray-700 prose-ul:my-2 prose-ol:my-2
      prose-strong:text-gray-800 prose-a:text-indigo-600
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function LinkCard({ link }: { link: LessonLink }) {
  return (
    <a
      href={link.url ?? link.file_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
    >
      <span className="text-lg mt-0.5">{link.type === 'file' ? '📎' : '🔗'}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700 truncate">{link.title}</p>
        {link.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{link.description}</p>}
        <p className="text-xs text-indigo-500 mt-1 truncate">{link.url ?? link.file_url}</p>
      </div>
    </a>
  );
}

export default function LessonOutput({
  lessonId,
  outputs,
  mode = 'professor',
  complementaryLinks = [],
  onAddLink,
  onPublish,
  published = false,
  publishUrl,
}: LessonOutputProps) {
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const quizTotal = outputs.quiz?.length ?? 0;

  function handleAnswer(_idx: number, _sel: string, correct: boolean) {
    setAnsweredCount((prev) => prev + 1);
    if (correct) setQuizScore((prev) => ({ correct: (prev?.correct ?? 0) + 1, total: quizTotal }));
    else setQuizScore((prev) => ({ correct: prev?.correct ?? 0, total: quizTotal }));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/download`);
      if (!res.ok) throw new Error('Falha ao gerar documento');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'aula.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar documento');
    } finally {
      setDownloading(false);
    }
  }

  async function handlePublish() {
    if (!onPublish) return;
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

  const hasLinks = complementaryLinks.length > 0;

  return (
    <div className="space-y-0">
      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const badge =
            tab.id === 'quiz' && quizTotal > 0 ? `${quizTotal}` :
            tab.id === 'referencias' && hasLinks ? '+' : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
              {badge && (
                <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 font-semibold leading-none">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-72 py-5">
        {activeTab === 'resumo' && (
          <MarkdownContent content={outputs.summary ?? 'Resumo não disponível.'} />
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-3">
            {outputs.quiz && outputs.quiz.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400">{outputs.quiz.length} questões</p>
                  {mode === 'student' && answeredCount > 0 && (
                    <p className="text-xs font-medium text-indigo-600">
                      {quizScore?.correct ?? 0}/{answeredCount} corretas
                    </p>
                  )}
                </div>
                {outputs.quiz.map((item, i) => (
                  <QuizCardInteractive
                    key={i}
                    item={item}
                    index={i}
                    mode={mode}
                    onAnswer={handleAnswer}
                  />
                ))}
                {mode === 'student' && answeredCount === quizTotal && quizTotal > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                    <p className="text-sm font-semibold text-indigo-800">
                      Resultado: {quizScore?.correct ?? 0}/{quizTotal} ({Math.round(((quizScore?.correct ?? 0) / quizTotal) * 100)}%)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Quiz não disponível.</p>
            )}
          </div>
        )}

        {activeTab === 'proxima' && (
          <MarkdownContent content={outputs.next_class_suggestions ?? 'Sugestões não disponíveis.'} />
        )}

        {activeTab === 'referencias' && (
          <div className="space-y-5">
            <MarkdownContent content={outputs.references ?? 'Referências não disponíveis.'} />

            {/* Links complementares */}
            {(hasLinks || mode === 'professor') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Materiais complementares {hasLinks ? `(${complementaryLinks.length})` : ''}
                  </h3>
                  {mode === 'professor' && onAddLink && (
                    <button
                      onClick={onAddLink}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      + Adicionar
                    </button>
                  )}
                </div>
                {hasLinks ? (
                  <div className="space-y-2">
                    {complementaryLinks.map((link) => (
                      <LinkCard key={link.id} link={link} />
                    ))}
                  </div>
                ) : mode === 'professor' ? (
                  <p className="text-xs text-gray-400 italic">
                    Nenhum material adicionado. Clique em &ldquo;Adicionar&rdquo; para incluir links ou PDFs complementares.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcricao' && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">Síntese da transcrição</p>
            <MarkdownContent content={outputs.transcription_summary ?? outputs.transcription ?? 'Transcrição não disponível.'} />
          </div>
        )}
      </div>

      {/* Actions — professor only */}
      {mode === 'professor' && (
        <div className="border-t border-gray-100 pt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {downloading ? <span className="animate-spin inline-block w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full" /> : <span>⬇</span>}
            {downloading ? 'Gerando...' : 'Baixar .docx'}
          </button>

          {onPublish && (
            published ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-3 py-2 rounded-lg">
                  ✓ Publicado no Google Classroom
                </span>
                {publishUrl && (
                  <a href={publishUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                    Ver post →
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {publishing ? <span className="animate-spin inline-block w-3.5 h-3.5 border border-white border-t-transparent rounded-full" /> : <span>📢</span>}
                {publishing ? 'Publicando...' : 'Publicar no Google Classroom'}
              </button>
            )
          )}

          {error && <p className="w-full text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
