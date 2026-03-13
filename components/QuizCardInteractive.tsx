'use client';
import { useState } from 'react';
import type { QuizQuestion } from '@/types';

interface QuizCardInteractiveProps {
  item: QuizQuestion;
  index: number;
  mode: 'professor' | 'student';
  onAnswer?: (index: number, selected: string, correct: boolean) => void;
}

export default function QuizCardInteractive({ item, index, mode, onAnswer }: QuizCardInteractiveProps) {
  const [revealed, setRevealed] = useState(false);           // modo professor
  const [selected, setSelected] = useState<string | null>(null);  // modo student
  const [confirmed, setConfirmed] = useState(false);         // student: após confirmar

  const answerLetter = item.answer?.charAt(0)?.toUpperCase();

  function handleSelectOption(letter: string) {
    if (confirmed) return; // trava após confirmar
    setSelected(letter);
  }

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
    const correct = selected === answerLetter;
    onAnswer?.(index, selected, correct);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3 hover:border-indigo-200 transition-colors">
      {/* Número + enunciado */}
      <p className="text-sm font-semibold text-gray-800 leading-snug">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2">
          {index + 1}
        </span>
        {item.question}
      </p>

      {/* Opções */}
      <ul className="space-y-1.5">
        {item.options.map((opt, j) => {
          const letter = String.fromCharCode(65 + j);
          const isAnswer = letter === answerLetter;

          // Estilo modo professor
          if (mode === 'professor') {
            return (
              <li
                key={opt}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  revealed && isAnswer
                    ? 'bg-green-50 border-green-300 text-green-800 font-medium'
                    : 'border-gray-100 text-gray-600 bg-gray-50'
                }`}
              >
                {opt}
              </li>
            );
          }

          // Estilo modo student
          const isSelected = selected === letter;
          let studentClass = 'border-gray-100 text-gray-600 bg-gray-50 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30';
          if (confirmed) {
            if (isAnswer) studentClass = 'bg-green-50 border-green-400 text-green-800 font-medium';
            else if (isSelected) studentClass = 'bg-red-50 border-red-300 text-red-700';
            else studentClass = 'border-gray-100 text-gray-400 bg-gray-50';
          } else if (isSelected) {
            studentClass = 'border-indigo-400 bg-indigo-50 text-indigo-800 font-medium cursor-pointer';
          }

          return (
            <li
              key={opt}
              onClick={() => handleSelectOption(letter)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${studentClass}`}
            >
              <span className="font-bold mr-1">{letter})</span> {opt.replace(/^[A-D]\)\s*/, '')}
              {confirmed && isAnswer && <span className="ml-2">✓</span>}
              {confirmed && isSelected && !isAnswer && <span className="ml-2">✗</span>}
            </li>
          );
        })}
      </ul>

      {/* Confirmar — modo student */}
      {mode === 'student' && !confirmed && (
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="text-xs font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
        >
          Confirmar resposta
        </button>
      )}

      {/* Feedback student após confirmar */}
      {mode === 'student' && confirmed && (
        <div className={`text-xs rounded-lg px-3 py-2 font-medium ${selected === answerLetter ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {selected === answerLetter ? '✓ Correto!' : `✗ Errado. A resposta correta é ${answerLetter}.`}
        </div>
      )}

      {/* Explicação */}
      {((mode === 'professor' && revealed) || (mode === 'student' && confirmed)) && item.explanation && (
        <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
          💡 {item.explanation}
        </p>
      )}

      {/* Toggle reveal — modo professor */}
      {mode === 'professor' && (
        <button
          onClick={() => setRevealed((r) => !r)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {revealed ? '▲ Ocultar resposta' : '▼ Ver resposta'}
        </button>
      )}
    </div>
  );
}
