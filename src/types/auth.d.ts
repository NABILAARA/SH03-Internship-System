import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    image?: string | null;
  }
}
