import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

export interface LessonOutputs {
  summary: string;
  quiz: QuizItem[];
  references: string;
  transcription_summary: string;
  next_class_suggestions: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export async function generateLessonOutputs(
  transcription: string,
  slidesText: string,
  classroomName: string,
  durationMin: number
): Promise<LessonOutputs> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const date = new Date().toLocaleDateString('pt-BR');
  const userPrompt = buildUserPrompt(
    transcription,
    slidesText,
    classroomName,
    durationMin,
    date
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const parsed = JSON.parse(text) as LessonOutputs;

  // Validate required fields
  if (
    !parsed.summary ||
    !Array.isArray(parsed.quiz) ||
    !parsed.references ||
    !parsed.transcription_summary ||
    !parsed.next_class_suggestions
  ) {
    throw new Error('Claude retornou JSON com campos ausentes');
  }

  return parsed;
}
