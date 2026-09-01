"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Trash2, Upload, X, ZoomIn, ZoomOut, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { uploadAvatarAction, removeAvatarAction } from "@/features/profile/services/avatar.actions";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/utils/cn";

/* ─── Constants ──────────────────────────────────────────── */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OUTPUT_SIZE = 512; // px — canvas output square

/* ─── Types ──────────────────────────────────────────────── */
interface AvatarEditModalProps {
  /** Current avatar URL (from DB / session) */
  currentImage?: string | null;
  /** User's display name for fallback initials */
  name?: string | null;
  email?: string | null;
  /** Called after a successful upload — receives new image URL */
  onAvatarChange: (newUrl: string | null) => void;
}

interface CropState {
  x: number; // offset px
  y: number; // offset px
  zoom: number; // 1.0 = fit
}

/* ─── Crop canvas helpers ────────────────────────────────── */

/** Draw the source image onto a 512×512 canvas with current crop/zoom. */
function drawCroppedCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  crop: CropState
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = OUTPUT_SIZE;
  canvas.width = size;
  canvas.height = size;

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Clip to circle for visual preview (actual saved file is square)
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  // The image is rendered as if the canvas is the "viewport"
  // and we pan/zoom inside it.
  const scaledW = img.naturalWidth * crop.zoom;
  const scaledH = img.naturalHeight * crop.zoom;

  // Center of image at center of canvas + user offset
  const drawX = (size - scaledW) / 2 + crop.x;
  const drawY = (size - scaledH) / 2 + crop.y;

  ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
  ctx.restore();
}

/** Export canvas to a WebP Blob. */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/webp",
      0.92
    );
  });
}

/* ─── Main Component ─────────────────────────────────────── */
export function AvatarEditModal({
  currentImage,
  name,
  email,
  onAvatarChange,
}: Readonly<AvatarEditModalProps>) {
  const [open, setOpen] = useState(false);
  const { update: updateSession } = useSession();

  /* ── Image loading state ── */
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  /* ── Crop state ── */
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, zoom: 1 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /* ── Drag-to-pan ── */
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  /* ── File drop zone ── */
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Feedback ── */
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  /* ─ Reset modal state when opened/closed ─ */
  useEffect(() => {
    if (!open) {
      setSrcDataUrl(null);
      setLoadedImg(null);
      setCrop({ x: 0, y: 0, zoom: 1 });
      setFileError(null);
      setSaveError(null);
      setSaveSuccess(false);
      setRemoveConfirm(false);
      imgRef.current = null;
    }
  }, [open]);

  /* ─ Redraw canvas whenever crop or image changes ─ */
  useEffect(() => {
    if (canvasRef.current && loadedImg) {
      drawCroppedCanvas(canvasRef.current, loadedImg, crop);
    }
  }, [crop, loadedImg]);

  /* ── Load image from data URL ── */
  const loadImageFromDataUrl = useCallback((dataUrl: string) => {
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      setLoadedImg(img);

      // Auto-fit zoom: make the image fill the 512 canvas
      const fitZoom = Math.max(OUTPUT_SIZE / img.naturalWidth, OUTPUT_SIZE / img.naturalHeight);
      setCrop({ x: 0, y: 0, zoom: fitZoom });
    };
    img.src = dataUrl;
  }, []);

  /* ── Validate and read a File ── */
  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      setSaveError(null);
      setSaveSuccess(false);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError("Format tidak didukung. Gunakan JPEG, PNG, atau WebP.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFileError("Ukuran file maksimal 5 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setSrcDataUrl(result);
          loadImageFromDataUrl(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [loadImageFromDataUrl]
  );

  /* ── Input change ── */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  /* ── Drop zone ── */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  /* ── Drag-to-pan on canvas ── */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setCrop((c) => ({ ...c, x: dragStart.current.cx + dx, y: dragStart.current.cy + dy }));
  };
  const handleMouseUp = () => { isDragging.current = false; };

  /* Touch drag */
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    isDragging.current = true;
    dragStart.current = { x: t.clientX, y: t.clientY, cx: crop.x, cy: crop.y };
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    setCrop((c) => ({ ...c, x: dragStart.current.cx + dx, y: dragStart.current.cy + dy }));
  };
  const handleTouchEnd = () => { isDragging.current = false; };

  /* ── Zoom ── */
  const adjustZoom = (delta: number) => {
    setCrop((c) => ({ ...c, zoom: Math.min(5, Math.max(0.2, c.zoom + delta)) }));
  };
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!canvasRef.current || !loadedImg) return;

    setUploading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Redraw without circle clip for the final saved file (square 512×512)
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = OUTPUT_SIZE;
      finalCanvas.height = OUTPUT_SIZE;
      const ctx = finalCanvas.getContext("2d");
      if (ctx) {
        const scaledW = loadedImg.naturalWidth * crop.zoom;
        const scaledH = loadedImg.naturalHeight * crop.zoom;
        const drawX = (OUTPUT_SIZE - scaledW) / 2 + crop.x;
        const drawY = (OUTPUT_SIZE - scaledH) / 2 + crop.y;
        ctx.drawImage(loadedImg, drawX, drawY, scaledW, scaledH);
      }

      const blob = await canvasToBlob(finalCanvas);

      const formData = new FormData();
      formData.append("file", blob, "avatar.webp");

      const result = await uploadAvatarAction(formData);

      if (result.error) {
        setSaveError(result.error);
      } else if (result.imageUrl) {
        setSaveSuccess(true);
        onAvatarChange(result.imageUrl);
        // Refresh NextAuth session so sidebar picks up the new image
        await updateSession({ image: result.imageUrl });
        setTimeout(() => setOpen(false), 800);
      }
    } catch {
      setSaveError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  /* ── Remove ── */
  const handleRemove = async () => {
    setRemoving(true);
    setSaveError(null);
    try {
      const result = await removeAvatarAction();
      if (result.error) {
        setSaveError(result.error);
        setRemoving(false);
        setRemoveConfirm(false);
      } else {
        onAvatarChange(null);
        // Refresh NextAuth session so sidebar picks up the removal
        await updateSession({ image: null });
        setOpen(false);
      }
    } catch {
      setSaveError("Gagal menghapus foto profil.");
      setRemoving(false);
      setRemoveConfirm(false);
    }
  };

  const hasCurrentImage = !!currentImage;
  const hasCropImage = !!srcDataUrl && !!loadedImg;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* ── Trigger ── */}
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="group relative shrink-0 focus:outline-none"
          aria-label="Ubah foto profil"
        >
          <UserAvatar src={currentImage} name={name} email={email} size="xl" />
          {/* Hover overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="h-6 w-6 text-white" />
            <span className="mt-0.5 text-[9px] font-bold text-white">Ubah</span>
          </div>
        </button>
      </Dialog.Trigger>

      {/* ── Overlay ── */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* ── Content ── */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-slate-100 bg-white shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "focus:outline-none mx-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <Dialog.Title className="text-sm font-bold text-slate-800">
              Ubah Foto Profil
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* ── Step 1: No image selected yet — show current + upload area ── */}
            {!hasCropImage && (
              <>
                {/* Current avatar preview */}
                <div className="flex justify-center">
                  <UserAvatar
                    src={currentImage}
                    name={name}
                    email={email}
                    size="xl"
                    className="ring-4 ring-blue-100"
                  />
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors",
                    dragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
                  )}
                >
                  <Upload className="h-6 w-6 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-600">
                    Klik atau seret foto ke sini
                  </p>
                  <p className="text-[10px] text-slate-400">
                    JPEG · PNG · WebP — maks. 5 MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {fileError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {fileError}
                  </div>
                )}

                {/* Remove button — only if user has a photo */}
                {hasCurrentImage && (
                  <div className="border-t border-slate-100 pt-3">
                    {!removeConfirm ? (
                      <button
                        type="button"
                        onClick={() => setRemoveConfirm(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus Foto Profil
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-center text-xs text-slate-600 font-medium">
                          Yakin ingin menghapus foto profil?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRemoveConfirm(false)}
                            disabled={removing}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleRemove}
                            disabled={removing}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                          >
                            {removing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {saveError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {saveError}
                  </div>
                )}
              </>
            )}

            {/* ── Step 2: Image selected — crop interface ── */}
            {hasCropImage && (
              <>
                <p className="text-center text-xs text-slate-500">
                  Seret foto untuk mengatur posisi · Scroll atau gunakan tombol untuk zoom
                </p>

                {/* Canvas crop area */}
                <div className="flex justify-center">
                  <div
                    className="relative overflow-hidden rounded-full ring-4 ring-blue-100"
                    style={{ width: 200, height: 200 }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={OUTPUT_SIZE}
                      height={OUTPUT_SIZE}
                      style={{ width: 200, height: 200, cursor: "grab", touchAction: "none" }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onWheel={handleWheel}
                    />
                  </div>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustZoom(-0.15)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={0.2}
                    max={5}
                    step={0.05}
                    value={crop.zoom}
                    onChange={(e) =>
                      setCrop((c) => ({ ...c, zoom: parseFloat(e.target.value) }))
                    }
                    className="w-32 accent-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => adjustZoom(0.15)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Change photo button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Pilih foto lain
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {(saveError || fileError) && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {saveError ?? fileError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    Foto profil berhasil disimpan!
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {hasCropImage && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={uploading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading || saveSuccess}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Tersimpan
                  </>
                ) : (
                  "Simpan Foto"
                )}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
