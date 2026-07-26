import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth/config";
import Credentials from "next-auth/providers/credentials";
import Github from "next-auth/providers/github";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/utils/hash";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  ...authConfig,
  providers: [
    Github({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user repo", // Needs repo scope to read collaborator/private repos
        },
      },
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await prisma.user.findUnique({
          where: { email }
        });
        if (!user || !user.password) {
          return null;
        }

        // Check if user is approved (for INTERN and MENTOR roles)
        if (user.approvalStatus === "PENDING") {
          throw new Error("Akun Anda masih menunggu persetujuan admin.");
        }

        if (user.approvalStatus === "REJECTED") {
          throw new Error("Akun Anda telah ditolak. Hubungi admin untuk informasi lebih lanjut.");
        }

        const { match, needsUpgrade } = verifyPassword(password, user.password);

        if (!match) return null;

        // Hash lama (PBKDF2) — upgrade ke bcrypt secara silent di background.
        // Tidak memblokir login; user tidak merasakan perbedaan apapun.
        if (needsUpgrade) {
          prisma.user
            .update({
              where: { id: user.id },
              data: { password: hashPassword(password) },
            })
            .catch((err) =>
              console.error("[auth] Failed to upgrade password hash:", err)
            );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      }
    })
  ]
});

