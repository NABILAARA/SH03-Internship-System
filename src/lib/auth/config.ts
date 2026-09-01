import type { NextAuthConfig } from "next-auth";

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
        // Persist image into token on first sign-in
        token.image = user.image ?? null;
      }

      // Handle session update to refresh token data
      if (trigger === "update" && session) {
        token.role = session.role;
        // Allow refreshing image via update() call
        if ("image" in session) {
          token.image = session.image ?? null;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as import("@/types/roles").UserRole;
        // Expose image to session — components can read session.user.image
        if (token.image !== undefined) {
          // Cast needed: JWT token.image can be {} in some NextAuth versions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).image = token.image ?? null;
        }
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
