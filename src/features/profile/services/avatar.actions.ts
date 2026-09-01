"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const BUCKET = "profile-avatars";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Derive the storage path for a given userId (always overwrites). */
function storagePath(userId: string) {
  return `${userId}/avatar.webp`;
}

/**
 * Upload or replace the authenticated user's avatar.
 * Expects a FormData payload with a "file" entry (Blob/File).
 * Returns the public URL (with cache-buster) stored in User.image.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<{ success?: true; imageUrl?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };
    const userId = session.user.id;

    const file = formData.get("file");
    if (!(file instanceof Blob)) return { error: "File tidak ditemukan." };

    // ── Server-side validation ──────────────────────────────
    if (file.size > MAX_SIZE_BYTES)
      return { error: "Ukuran file maksimal 5 MB." };

    // Validate MIME from the blob type (not filename extension)
    const mimeType = file.type;
    if (!ALLOWED_MIME.includes(mimeType))
      return { error: "Format file tidak valid. Gunakan JPEG, PNG, atau WebP." };

    // Read bytes and double-check magic bytes to prevent MIME spoofing
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!isAllowedImageBytes(bytes))
      return { error: "File bukan gambar yang valid." };

    // ── Upload to Supabase Storage ──────────────────────────
    const supabase = createAdminClient();

    // Ensure bucket exists (no-op if already there)
    await ensureBucket(supabase);

    const path = storagePath(userId);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: "image/webp",
        upsert: true, // overwrite existing — no orphan files
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return { error: "Gagal mengunggah foto. Coba lagi." };
    }

    // ── Get public URL + cache-buster ──────────────────────
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // ── Update database ────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { image: publicUrl },
    });

    // Revalidate all role profile paths
    revalidatePath("/intern/profile");
    revalidatePath("/mentor/profile");
    revalidatePath("/admin/settings");

    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    console.error("uploadAvatarAction error:", err);
    return { error: "Terjadi kesalahan saat mengunggah foto." };
  }
}

/**
 * Remove the authenticated user's avatar:
 * - Deletes file from Supabase Storage
 * - Sets User.image = null in database
 */
export async function removeAvatarAction(): Promise<{
  success?: true;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };
    const userId = session.user.id;

    const supabase = createAdminClient();
    const path = storagePath(userId);

    // Delete from storage (ignore "not found" — might never have been uploaded)
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (deleteError && deleteError.message !== "Object not found") {
      console.error("Supabase delete error:", deleteError);
      // Non-fatal — still clear DB
    }

    // Clear DB field regardless of storage result
    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });

    revalidatePath("/intern/profile");
    revalidatePath("/mentor/profile");
    revalidatePath("/admin/settings");

    return { success: true };
  } catch (err) {
    console.error("removeAvatarAction error:", err);
    return { error: "Gagal menghapus foto profil." };
  }
}

/**
 * Fetch current avatar URL for the authenticated user.
 * Used to hydrate client components on mount.
 */
export async function getAvatarUrlAction(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });
    return user?.image ?? null;
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Verify magic bytes to guard against MIME-type spoofing.
 * Checks for JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF...WEBP).
 */
function isAllowedImageBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;

  // WebP: 52 49 46 46 ... 57 45 42 50  (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true;

  return false;
}

/**
 * Create the storage bucket if it doesn't already exist.
 * Public-read so avatar URLs are directly accessible in <img> tags.
 */
async function ensureBucket(
  supabase: ReturnType<typeof createAdminClient>
) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME,
    });
  }
}
