import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

// Config edge-safe (sin Prisma ni bcrypt): la usa el middleware para proteger rutas.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      if (isOnLogin) {
        if (isLoggedIn) {
          const home = auth.user.role === "MASTER" ? "/master" : "/characters";
          return Response.redirect(new URL(home, nextUrl));
        }
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? "PLAYER") as Role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? "PLAYER") as Role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
