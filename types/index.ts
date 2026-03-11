// ProfIA — TypeScript Interfaces
// Source: squads/profiai/docs/architecture/fullstack-architecture.md#data-models

export type LessonStatus =
  | 'pending'
  | 'uploading'
  | 'transcribing'
  | 'processing'
  | 'ready'
  | 'published'
  | 'error';

export interface User {
  id: string;
  email: string;
  name: string;
  google_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'trial' | 'starter' | 'pro' | 'heavy' | 'power';
  credits_total: number;
  credits_used: number;
  stripe_sub_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
}

export interface Classroom {
  id: string;
  user_id: string;
  google_classroom_id: string;
  name: string;
  section: string | null;
  synced_at: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  classroom_id: string;
  title: string;
  recorded_at: string;
  duration_secs: number | null;
  audio_url: string | null;
  slides_url: string | null;
  status: LessonStatus;
  credits_consumed: number;
  error_message: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[]; // ["A) ...", "B) ...", "C) ...", "D) ..."]
  answer: string; // "A" | "B" | "C" | "D"
  explanation: string;
}

export interface LessonOutput {
  id: string;
  lesson_id: string;
  transcription: string | null;
  summary: string | null;
  quiz: QuizQuestion[] | null;
  references: string | null;
  next_class_suggestions: string | null;
  google_post_id: string | null;
  published_at: string | null;
}

export interface TeachingPlan {
  id: string;
  user_id: string;
  classroom_id: string;
  content: string;
  uploaded_at: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ProcessingStatus {
  lesson_id: string;
  status: LessonStatus;
  step: string;
  progress: number;
  error_message: string | null;
}
