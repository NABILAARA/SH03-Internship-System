import { z } from "zod";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;
const STRONG_PASSWORD_MESSAGE =
  "Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, angka, dan simbol (contoh: !@#$%).";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const ALLOWED_EMAIL_DOMAINS = ["gmail.com"];
const ALLOWED_EMAIL_SUFFIXES = [".ac.id"];

function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return (
    ALLOWED_EMAIL_DOMAINS.includes(domain) ||
    ALLOWED_EMAIL_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  );
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
  name: z.string().min(2),
  confirmPassword: z.string().min(8),
  role: z.enum(["MENTOR", "INTERN"]).optional().default("INTERN")
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"]
  }
).refine(
  (data) => isAllowedEmail(data.email),
  {
    message: "Email harus menggunakan @gmail.com atau domain universitas (contoh: @student.ui.ac.id)",
    path: ["email"]
  }
);

/** Reusable strong password validator — dipakai di server actions admin */
export function validateStrongPassword(password: string): string | null {
  if (!STRONG_PASSWORD_REGEX.test(password)) return STRONG_PASSWORD_MESSAGE;
  return null;
}
