import NextAuth from 'next-auth';

// Edge-compatible NextAuth config — no providers, no bcrypt.
// Used only by middleware for session/JWT checking.
export const { auth } = NextAuth({
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
