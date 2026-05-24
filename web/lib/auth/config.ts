import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google   from 'next-auth/providers/google';
import Twitter  from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import { getAuthorByAuthId, createAuthor, verifyPassword } from '@/lib/db/queries/authors';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { z } from 'zod';

// Custom Instagram OAuth2 provider
const Instagram = {
  id:   'instagram',
  name: 'Instagram',
  type: 'oauth' as const,
  authorization: {
    url:    'https://api.instagram.com/oauth/authorize',
    params: { scope: 'user_profile,user_media' },
  },
  token:   'https://api.instagram.com/oauth/access_token',
  userinfo: 'https://graph.instagram.com/me?fields=id,username',
  profile(profile: { id: string; username: string }) {
    return {
      id:    profile.id,
      name:  profile.username,
      email: null,
      image: null,
    };
  },
  clientId:     process.env.INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  style: { logo: '', bg: '#E1306C', text: '#fff' },
};

const credentialsSchema = z.object({
  email:        z.string().email(),
  password:     z.string().min(8),
  captchaToken: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  // JWT sessions: required for Credentials provider in NextAuth v5.
  // Redis is still used elsewhere (cache, rate limit, locks, password reset).
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Twitter({
      clientId:     process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
    Instagram as NextAuthConfig['providers'][0],
    Credentials({
      credentials: {
        email:        { label: 'Email',    type: 'email' },
        password:     { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha',  type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ok = await verifyTurnstile(parsed.data.captchaToken);
        if (!ok) return null;

        const author = await verifyPassword(parsed.data.email, parsed.data.password);
        if (!author) return null;
        return { id: author.id, name: author.displayName, email: parsed.data.email, image: author.avatarImage };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.type === 'oauth') {
        const authId = `${account.provider}:${account.providerAccountId}`;
        const existing = await getAuthorByAuthId(authId);
        if (!existing) {
          await createAuthor({
            authId,
            displayName: user.name ?? user.email?.split('@')[0] ?? 'Author',
            avatarImage: user.image ?? undefined,
          });
        }
      }
      return true;
    },

    // Embed our internal authId in the JWT on first sign-in so the session
    // callback can resolve the authors row on every request without a DB lookup
    // chain through the adapter.
    async jwt({ token, user, account }) {
      if (user && account) {
        if (account.type === 'oauth') {
          token.authId = `${account.provider}:${account.providerAccountId}`;
        } else if (account.provider === 'credentials' && user.email) {
          token.authId = `email:${user.email.toLowerCase()}`;
        }
      }
      return token;
    },

    async session({ session, token }) {
      const authId = token.authId as string | undefined;
      if (!authId) return session;
      const author = await getAuthorByAuthId(authId);
      if (author) {
        session.user.id          = author.id;
        session.user.name        = author.displayName;
        session.user.image       = author.avatarImage;
        session.user.displayName = author.displayName;
      }
      return session;
    },
  },

  pages: {
    signIn:  '/login',
    error:   '/login',
    newUser: '/',
  },
});

// Augment next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id:           string;
      name:         string;
      email:        string;
      image?:       string;
      displayName:  string;
    };
  }
}
