import bcrypt from "bcryptjs";
import crypto from "crypto";

// Legacy PBKDF2 — dipakai untuk verifikasi hash lama yang sudah ada di database.
// JANGAN HAPUS selama masih ada user dengan hash format lama (hex string tanpa $2b$).
const LEGACY_SALT = process.env.AUTH_SECRET || "lexa-ims-default-salt";

function legacyHash(password: string): string {
  return crypto
    .pbkdf2Sync(password, LEGACY_SALT, 1000, 64, "sha512")
    .toString("hex");
}

/**
 * Hash password baru menggunakan bcrypt (cost factor 12).
 * Digunakan saat registrasi dan saat upgrade hash lama.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Verifikasi password terhadap hash yang tersimpan.
 * Mendukung dua format:
 *   - bcrypt  : hash diawali "$2b$" atau "$2a$"
 *   - legacy  : hex string PBKDF2 (format lama)
 *
 * Kembalikan { match: boolean, needsUpgrade: boolean }
 * needsUpgrade = true berarti hash masih format lama dan harus di-rehash setelah login berhasil.
 */
export function verifyPassword(
  password: string,
  storedHash: string
): { match: boolean; needsUpgrade: boolean } {
  const isBcrypt =
    storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$");

  if (isBcrypt) {
    return {
      match: bcrypt.compareSync(password, storedHash),
      needsUpgrade: false,
    };
  }

  // Format lama — verifikasi PBKDF2, tandai untuk upgrade
  return {
    match: legacyHash(password) === storedHash,
    needsUpgrade: true,
  };
}
