import { createClient } from '@supabase/supabase-js';

// Client-side (anon key — pode ser exposto ao browser)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side APENAS (service role — NUNCA usar no cliente)
// Usar somente dentro de app/api/ routes
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
