import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    jwt({ token, account, profile }) {
      // Pin the JWT subject to the provider's STABLE account id (Google `sub`)
      // on initial sign-in. Without this, Auth.js assigns a fresh random UUID
      // per session, so the same Google account gets a different id on every
      // device and every login — which silos each device into its own cloud
      // namespace and breaks cross-device sync. providerAccountId === Google sub.
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (profile?.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
