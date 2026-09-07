"use client";

import { useRef, useState } from "react";
import { Award, Download, Loader2, Printer, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Evaluation = { finalScore: number };
type Program    = { title: string };
type Application = { program: Program };
type User = {
  name: string | null;
  email: string;
  internEvaluation: Evaluation | null;
  applications: Application[];
};
type Certificate = { certNumber: string; issuedAt: Date; user: User };
type InternCertificateProps = { certificate: Certificate | null };

export function InternCertificate({ certificate }: Readonly<InternCertificateProps>) {
  const certRef    = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!certificate) return;
    setIsGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      // A4 landscape: 297mm × 210mm
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297;
      const H = 210;
      const cx = W / 2; // center x

      // ── Background gradient simulation ──
      pdf.setFillColor(247, 250, 255);
      pdf.rect(0, 0, W, H, "F");
      pdf.setFillColor(255, 255, 255);
      pdf.ellipse(cx, H * 0.35, 90, 60, "F");

      // ── Outer double border ──
      pdf.setDrawColor(30, 58, 138);   // blue-900
      pdf.setLineWidth(1.2);
      pdf.rect(6, 6, W - 12, H - 12);
      pdf.setLineWidth(0.4);
      pdf.rect(8, 8, W - 16, H - 16);

      // ── Gold corner ornaments ──
      const ornSize = 6;
      pdf.setDrawColor(245, 158, 11); // amber-400
      pdf.setLineWidth(1.2);
      const corners = [
        [12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12],
      ] as [number, number][];
      corners.forEach(([x, y]) => {
        const dx = x < cx ? 1 : -1;
        const dy = y < H / 2 ? 1 : -1;
        pdf.line(x, y, x + dx * ornSize, y);
        pdf.line(x, y, x, y + dy * ornSize);
      });

      // ── Logo image ──
      try {
        const logoRes = await fetch("/logo-lexa.png");
        const logoBlob = await logoRes.blob();
        const logoB64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        // Logo centered, height 14mm, width auto (logo is ~2.4:1 ratio)
        const logoH = 14;
        const logoW = logoH * 2.4;
        pdf.addImage(logoB64, "PNG", cx - logoW / 2, 13, logoW, logoH);
      } catch {
        // Fallback to text if image fails to load
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138);
        pdf.text("LEXA TECHNOLOGY", cx, 24, { align: "center" });
      }

      // ── Decorative line under logo ──
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.5);
      pdf.line(cx - 30, 29, cx + 30, 29);

      // ── "SERTIFIKAT KELULUSAN" ──
      pdf.setFont("times", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(30, 41, 59);
      pdf.text("SERTIFIKAT KELULUSAN", cx, 40, { align: "center" });

      // Underline
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.8);
      const titleW = pdf.getTextWidth("SERTIFIKAT KELULUSAN");
      pdf.line(cx - titleW / 2, 42, cx + titleW / 2, 42);

      // ── Certificate number ──
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`NOMOR: ${certificate.certNumber}`, cx, 48, { align: "center" });

      // ── "Dengan bangga..." ──
      pdf.setFont("helvetica", "bolditalic");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text("Dengan bangga menyatakan bahwa:", cx, 65, { align: "center" });

      // ── Recipient name ──
      pdf.setFont("times", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(30, 58, 138); // blue-900
      pdf.text(certificate.user.name ?? "—", cx, 78, { align: "center" });

      // Name underline
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.5);
      const nameW = pdf.getTextWidth(certificate.user.name ?? "—");
      pdf.line(cx - nameW / 2, 80, cx + nameW / 2, 80);

      // ── Body text ──
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105); // slate-600
      pdf.text(
        "Telah menyelesaikan program magang kerja praktik (internship) secara penuh waktu sebagai",
        cx, 90, { align: "center" }
      );

      // Program title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text(programTitle, cx, 100, { align: "center" });

      // Score
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text("dengan Nilai Akhir Evaluasi Kumulatif sebesar", cx, 110, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 58, 138);
      pdf.text(`${finalScore.toFixed(1)} / 100`, cx, 119, { align: "center" });

      // ── Footer — date & signature ──
      const issuedStr = new Date(certificate.issuedAt).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Jakarta, ${issuedStr}`, 30, 165);

      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineWidth(0.4);
      pdf.line(30, 178, 90, 178);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text("LEXA HR & Mentor Manager", 30, 183);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Direktorat Sumber Daya Manusia", 30, 188);

      // ── Official seal ──
      pdf.setFillColor(245, 158, 11);
      pdf.circle(W - 35, H - 32, 14, "F");
      pdf.setFillColor(251, 191, 36);
      pdf.circle(W - 35, H - 32, 11, "F");
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.4);
      pdf.circle(W - 35, H - 32, 10, "S");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(120, 53, 15); // amber-950
      pdf.text("ORIGINAL", W - 35, H - 30, { align: "center" });

      pdf.save(`Sertifikat-LEXA-${certificate.certNumber}.pdf`);
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!certificate) {
    return (
      <div className="space-y-6">
        <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            <span>Sertifikat Magang</span>
          </h1>
          <p className="text-sm text-slate-500">
            Unduh dokumen kelulusan resmi Anda setelah proses evaluasi selesai.
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm space-y-4">
          <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100 animate-pulse">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Sertifikat Belum Tersedia</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Sertifikat kelulusan digital Anda sedang diproses. Dokumen ini akan dirilis secara
            otomatis setelah pembimbing Anda menyelesaikan penilaian nilai akhir magang.
          </p>
        </div>
      </div>
    );
  }

  const programTitle = certificate.user.applications[0]?.program.title || "Frontend Web Developer";
  const finalScore   = certificate.user.internEvaluation?.finalScore ?? 90.0;

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-certificate, #print-certificate * { visibility: visible; }
          #print-certificate {
            position: absolute; left: 0; top: 0;
            width: 100vw; height: 100vh;
            border: none; margin: 0; padding: 0;
            background: white !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* ── Header + Buttons ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            <span>Sertifikat Magang Rilis</span>
          </h1>
          <p className="text-sm text-slate-500">
            Selamat! Anda telah menyelesaikan program magang LEXA dengan predikat memuaskan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Membuat PDF...</span></>
            ) : (
              <><Download className="h-4 w-4" /><span>Download PDF</span></>
            )}
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Cetak</span>
          </Button>
        </div>
      </div>

      {/* ── Certificate Card ── */}
      <div className="w-full max-w-4xl mx-auto px-2 py-4">
        <div
          ref={certRef}
          id="print-certificate"
          className="relative bg-white shadow-2xl overflow-hidden"
          style={{
            width: "100%",
            aspectRatio: "297 / 210",
            border: "12px double #1e3a8a",
            backgroundImage: "radial-gradient(circle at 50% 30%, rgba(239,246,255,0.6) 0%, #fff 65%)",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            padding: "3.5% 5.5%",
            boxSizing: "border-box",
          }}
        >
          {/* Corner ornaments */}
          <div className="absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-amber-400" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-amber-400" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-amber-400" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-amber-400" />

          {/* ── Header ── */}
          <div className="text-center flex flex-col items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-lexa.png"
              alt="LEXA Technology"
              crossOrigin="anonymous"
              style={{ height: "clamp(28px, 4.5vw, 52px)", width: "auto", objectFit: "contain" }}
            />
            <h2
              className="font-serif font-bold text-slate-800 tracking-widest uppercase border-b-2 border-amber-400 pb-1"
              style={{ fontSize: "clamp(12px, 1.8vw, 22px)", whiteSpace: "nowrap" }}
            >
              Sertifikat Kelulusan
            </h2>
            <p style={{ fontSize: "clamp(6px, 0.75vw, 9px)" }} className="text-slate-400 uppercase tracking-widest font-semibold">
              Nomor: {certificate.certNumber}
            </p>
          </div>

          {/* ── Body — flex column centered ── */}
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <p style={{ fontSize: "clamp(7px, 1vw, 12px)" }} className="italic text-slate-500">
              Dengan bangga menyatakan bahwa:
            </p>
            <h3
              className="font-serif font-bold text-blue-900"
              style={{
                fontSize: "clamp(13px, 2vw, 24px)",
                textDecoration: "underline",
                textDecorationColor: "#f59e0b",
                textUnderlineOffset: "5px",
              }}
            >
              {certificate.user.name}
            </h3>
            <p style={{ fontSize: "clamp(7px, 1vw, 11px)" }} className="text-slate-600 max-w-[70%] leading-relaxed">
              Telah menyelesaikan program magang kerja praktik (internship) secara penuh waktu sebagai
            </p>
            <p style={{ fontSize: "clamp(9px, 1.3vw, 14px)" }} className="font-bold text-slate-800">
              {programTitle}
            </p>
            <p style={{ fontSize: "clamp(7px, 1vw, 11px)" }} className="text-slate-600">
              dengan Nilai Akhir Evaluasi Kumulatif sebesar{" "}
              <span className="font-extrabold text-blue-900">{finalScore.toFixed(1)} / 100</span>
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <p style={{ fontSize: "clamp(6px, 0.8vw, 9px)" }} className="text-slate-400">
                Jakarta,{" "}
                {new Date(certificate.issuedAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <div style={{ height: "clamp(20px, 3.5vw, 36px)", width: "clamp(60px, 10vw, 110px)", borderBottom: "1px solid #cbd5e1" }} />
              <p style={{ fontSize: "clamp(6px, 0.85vw, 10px)" }} className="font-bold text-slate-700">
                LEXA HR &amp; Mentor Manager
              </p>
              <p style={{ fontSize: "clamp(5px, 0.7vw, 9px)" }} className="text-slate-400">
                Direktorat Sumber Daya Manusia
              </p>
            </div>

            {/* Seal */}
            <div
              className="relative shrink-0 flex items-center justify-center rounded-full border-4 border-amber-400 bg-amber-500 shadow-lg"
              style={{ width: "clamp(44px, 7vw, 70px)", height: "clamp(44px, 7vw, 70px)", transform: "rotate(12deg)" }}
            >
              <div className="absolute inset-1.5 rounded-full border border-dashed border-white/60 flex flex-col items-center justify-center gap-0.5">
                <Sparkles
                  className="text-white"
                  style={{ width: "35%", height: "35%", animation: "spin 12s linear infinite" }}
                />
                <span
                  className="uppercase font-serif font-black tracking-widest text-amber-950 text-center leading-tight"
                  style={{ fontSize: "clamp(4px, 0.6vw, 7px)" }}
                >
                  ORIGINAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
