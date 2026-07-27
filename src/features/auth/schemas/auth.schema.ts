import { z } from "zod";

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

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
  role: z.enum(["MENTOR", "INTERN"]).optional().default("INTERN")
}).refine(
  (data) => isAllowedEmail(data.email),
  {
    message: "Email harus menggunakan @gmail.com atau domain universitas (contoh: @student.ui.ac.id)",
    path: ["email"]
  }
);
