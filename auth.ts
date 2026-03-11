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
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.googleId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.user.googleId = token.googleId as string | undefined;
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email || !account) return false;
      try {
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
          console.error('Error upserting user:', error);
          return false;
        }
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
        console.error('Error in signIn callback:', err);
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
});
