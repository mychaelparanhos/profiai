import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createServerSupabaseClient } from '@/lib/supabase';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.announcements',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log('[ProfIA] jwt callback — trigger:', account ? 'sign-in' : 'read');
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.googleId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[ProfIA] session callback — user:', session?.user?.email);
      session.accessToken = token.accessToken as string | undefined;
      session.user.googleId = token.googleId as string | undefined;
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email || !account) return false;
      try {
        console.log('[ProfIA] signIn callback — email:', user.email);
        console.log('[ProfIA] AUTH_SECRET set:', !!process.env.AUTH_SECRET, '| len:', process.env.AUTH_SECRET?.length);
        console.log('[ProfIA] SUPABASE_URL set:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('[ProfIA] SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY, '| len:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
        const supabase = createServerSupabaseClient();
        // Upsert user
        const { data: dbUser, error } = await supabase
          .from('users')
          .upsert(
            {
              email: user.email,
              name: user.name ?? '',
              google_id: account.providerAccountId,
            },
            { onConflict: 'google_id' }
          )
          .select()
          .single();
        if (error) {
          console.error('[ProfIA] Error upserting user — code:', error.code, '| message:', error.message, '| details:', error.details);
          return false;
        }
        console.log('[ProfIA] User upserted — id:', dbUser.id);
        // Create trial subscription if first login
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', dbUser.id)
          .maybeSingle();
        if (!existingSub) {
          await supabase.from('subscriptions').insert({
            user_id: dbUser.id,
            plan: 'trial',
            credits_total: 3,
            credits_used: 0,
            status: 'trialing',
          });
        }
        return true;
      } catch (err) {
        console.error('[ProfIA] EXCEPTION in signIn callback:', err);
        return false;
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
});
