import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types/roles";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60 // Update token every 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
      }

      // Handle session update to refresh token
      if (trigger === "update" && session) {
        token.role = session.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as UserRole;
      }

      return session;
    },
    // Authorized callback untuk validate session
    authorized({ request, auth }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;

      // Allow public pages
      if (
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/internship-information" ||
        pathname === "/forgot-password" ||
        pathname.startsWith("/reset-password")
      ) {
        return true;
      }

      // Require login for protected routes
      if (pathname.startsWith("/admin") || pathname.startsWith("/mentor") || pathname.startsWith("/intern")) {
        return isLoggedIn;
      }

      // Allow home page access
      return true;
    }
  }
} satisfies NextAuthConfig;
