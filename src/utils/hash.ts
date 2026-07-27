import bcrypt from "bcryptjs";

/**
 * Hash password menggunakan bcrypt (cost factor 12).
 * Setiap panggilan menghasilkan salt unik per user secara otomatis.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Verifikasi password terhadap bcrypt hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
