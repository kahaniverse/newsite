import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google   from 'next-auth/providers/google';
import Twitter  from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import { getAuthorByAuthId, createAuthor, verifyPassword } from '@/lib/db/queries/authors';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { DEMO_MODE, DEMO_AUTHOR_AUTH_ID } from '@/lib/auth/demo';
import { redis } from '@/lib/redis/client';
import { CacheKeys } from '@/lib/redis/cache';
import { createHash } from 'crypto';
import { z } from 'zod';


const credentialsSchema = z.object({
  email:        z.string().email(),
  password:     z.string().min(8),
  captchaToken: z.string().optional(),
  signinToken:  z.string().optional(),
});

// One-time auto-login grant minted by /api/auth/register. If it matches the
// email (single-use — deleted on redemption), the just-registered user skips
// the captcha for this immediate sign-in. Returns false on any mismatch or if
// Redis is unreachable, so the caller falls back to the normal captcha check.
async function consumeSignupGrant(token: string | undefined, email: string): Promise<boolean> {
  if (!token) return false;
  try {
    const hash   = createHash('sha256').update(token).digest('hex');
    const key    = CacheKeys.signupSignin(hash);
    const stored = await redis.get<string>(key);
    if (stored !== email.toLowerCase()) return false;
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

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
    Credentials({
      credentials: {
        email:        { label: 'Email',    type: 'email' },
        password:     { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha',  type: 'text' },
        signinToken:  { label: 'Signup',   type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // A valid one-time signup grant stands in for the captcha (signup
        // already passed Turnstile); otherwise require a fresh captcha.
        const granted = await consumeSignupGrant(parsed.data.signinToken, parsed.data.email);
        if (!granted) {
          const ok = await verifyTurnstile(parsed.data.captchaToken);
          if (!ok) return null;
        }

        const author = await verifyPassword(parsed.data.email, parsed.data.password);
        if (!author) return null;
        return { id: author.id, name: author.displayName, email: parsed.data.email, image: author.avatarImage };
      },
    }),

    // Demo-only passwordless provider for unattended marketing screencasts.
    // Present ONLY when DEMO_MODE is enabled (see lib/auth/demo.ts); absent in
    // production, so it cannot be used to bypass real login.
    ...(DEMO_MODE
      ? [
          Credentials({
            id: 'demo',
            name: 'Demo',
            credentials: {},
            async authorize() {
              const author = await getAuthorByAuthId(DEMO_AUTHOR_AUTH_ID);
              if (!author) return null;
              return {
                id: author.id,
                name: author.displayName,
                email: 'demo@kahaniverse.local',
                image: author.avatarImage,
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // OIDC providers (e.g. Google) report type 'oidc', not 'oauth'.
      if (account?.type === 'oauth' || account?.type === 'oidc') {
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
        if (account.type === 'oauth' || account.type === 'oidc') {
          token.authId = `${account.provider}:${account.providerAccountId}`;
        } else if (account.provider === 'demo' && DEMO_MODE) {
          token.authId = DEMO_AUTHOR_AUTH_ID;
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
