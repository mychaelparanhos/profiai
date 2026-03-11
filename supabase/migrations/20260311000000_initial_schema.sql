-- ============================================
-- PROFIAI — Initial Schema Migration
-- Arquivo: supabase/migrations/20260311000000_initial_schema.sql
-- ============================================

-- ========================
-- USERS
-- ========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  google_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (id = auth.uid());

-- ========================
-- SUBSCRIPTIONS
-- ========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'heavy', 'power')),
  credits_total INT NOT NULL DEFAULT 3,
  credits_used INT NOT NULL DEFAULT 0,
  stripe_sub_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own_data" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ========================
-- CLASSROOMS
-- ========================
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_classroom_id TEXT NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_classroom_id)
);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classrooms_own_data" ON classrooms
  FOR ALL USING (user_id = auth.uid());

-- ========================
-- LESSONS
-- ========================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  duration_secs INT,
  audio_url TEXT,
  slides_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'uploading', 'transcribing', 'processing', 'ready', 'published', 'error')
  ),
  credits_consumed INT NOT NULL DEFAULT 0,
  error_message TEXT
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_own_data" ON lessons
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_lessons_user_status ON lessons(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lessons_user_date ON lessons(user_id, recorded_at DESC);

-- ========================
-- LESSON OUTPUTS
-- ========================
CREATE TABLE IF NOT EXISTS lesson_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE UNIQUE,
  transcription TEXT,
  summary TEXT,
  quiz JSONB,
  "references" TEXT,
  next_class_suggestions TEXT,
  google_post_id TEXT,
  published_at TIMESTAMPTZ
);

ALTER TABLE lesson_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_outputs_via_lesson" ON lesson_outputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_outputs.lesson_id
      AND lessons.user_id = auth.uid()
    )
  );

-- ========================
-- TEACHING PLANS
-- ========================
CREATE TABLE IF NOT EXISTS teaching_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teaching_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teaching_plans_own_data" ON teaching_plans
  FOR ALL USING (user_id = auth.uid());

-- ========================
-- STORAGE: audio-temp RLS
-- (Executar APÓS criar o bucket audio-temp no Dashboard → Storage)
-- ========================
CREATE POLICY "audio_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-temp' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audio-temp' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio-temp' AND auth.uid()::text = (storage.foldername(name))[1]);
