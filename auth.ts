import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    session({ session, token }) {
      // Expose Google user ID in session for Blob path keying
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
