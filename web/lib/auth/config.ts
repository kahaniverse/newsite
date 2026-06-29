import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google   from 'next-auth/providers/google';
import Twitter  from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import { getAuthorByAuthId, getAuthorById, createAuthor, verifyPassword, getAuthorByRecoveryHash } from '@/lib/db/queries/authors';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { DEMO_MODE, DEMO_AUTHOR_AUTH_ID } from '@/lib/auth/demo';
import { generatePenName } from '@/lib/penname';
import { sampleAvatar } from '@/lib/sample-images';
import { redis } from '@/lib/redis/client';
import { CacheKeys } from '@/lib/redis/cache';
import { notifyAdminSignup } from '@/lib/email/client';
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

    // Anonymous, email-less login: the user presents the one-time recovery code
    // minted at signup. We hash it and match the stored hash — no identifier is
    // ever transmitted or stored in the clear. authorize() returns the account's
    // internal authId so the jwt callback can key the session on it.
    Credentials({
      id: 'recovery',
      name: 'Recovery code',
      credentials: { code: { label: 'Recovery code', type: 'text' } },
      async authorize(credentials) {
        const code = typeof credentials?.code === 'string' ? credentials.code.trim() : '';
        if (code.length < 8) return null;
        const hash = createHash('sha256').update(code).digest('hex');
        const author = await getAuthorByRecoveryHash(hash);
        if (!author) return null;
        return { id: author.id, name: author.displayName, image: author.avatarImage, authId: author.authId };
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
    async signIn({ account }) {
      // OIDC providers (e.g. Google) report type 'oidc', not 'oauth'.
      // AUTH-ONLY: we take only the opaque provider account id as proof of
      // ownership. We deliberately do NOT persist the provider's real name,
      // email, or photo — a new account gets a generated, editable pen name and
      // no avatar, so nothing here identifies the person behind it.
      if (account?.type === 'oauth' || account?.type === 'oidc') {
        const authId = `${account.provider}:${account.providerAccountId}`;
        const existing = await getAuthorByAuthId(authId);
        if (!existing) {
          const displayName = generatePenName();
          await createAuthor({ authId, displayName });
          await notifyAdminSignup({ identifier: displayName, provider: account.provider }).catch(err =>
            console.error('[signIn] admin notify failed (non-fatal):', err),
          );
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
        } else if (account.provider === 'recovery') {
          // Anon accounts have no email to key on — authorize() handed us the
          // opaque internal authId for exactly this.
          token.authId = (user as { authId?: string }).authId;
        } else if (account.provider === 'credentials' && user.email) {
          token.authId = `email:${user.email.toLowerCase()}`;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Primary: resolve by our internal authId (set in jwt for oauth/email/demo).
      // Fallback: token.sub. For credential logins (email AND recovery) we return
      // the author row's id from authorize(), so NextAuth stores it as token.sub —
      // this covers recovery accounts whose opaque authId isn't carried on the
      // token, without re-introducing any identifier.
      const authId = token.authId as string | undefined;
      const author = authId
        ? await getAuthorByAuthId(authId)
        : token.sub
          ? await getAuthorById(token.sub)
          : null;
      if (author) {
        // Rebuild user defensively — for recovery sign-ins session.user can
        // arrive undefined (no email/standard claims), which would otherwise
        // crash every page that reads session.user.id.
        session.user = {
          ...session.user,
          id:          author.id,
          name:        author.displayName,
          displayName: author.displayName,
          // Resolve the avatar with the SAME id-seeded fallback the profile/
          // author screens use, so the nav thumbnail and the profile hero show
          // the identical portrait when no real avatar has been uploaded.
          image:       author.avatarImage || sampleAvatar(author.id),
          email:       session.user?.email ?? '',
        };
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
