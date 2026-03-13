import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { JWT } from 'next-auth/jwt';

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || data.error) throw new Error(data.error ?? 'refresh failed');
    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  } catch (err) {
    console.error('[ProfIA] Token refresh error:', err);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

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
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        token.googleId = account.providerAccountId;
        return token;
      }
      // Token still valid — return as-is
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }
      // Token expired — refresh
      console.log('[ProfIA] jwt: access token expired, refreshing...');
      return refreshAccessToken(token);
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
