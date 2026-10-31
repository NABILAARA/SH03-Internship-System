import { prisma } from "@/lib/db";
import { CheckCircle, XCircle, Award } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifikasi Sertifikat — LEXA",
};

interface Props {
  params: { certNumber: string };
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { certNumber } = params;

  const certificate = await prisma.certificate.findUnique({
    where: { certNumber: decodeURIComponent(certNumber) },
    select: {
      certNumber: true,
      issuedAt: true,
      user: {
        select: {
          name: true,
          applications: {
            where: { status: "ACCEPTED" },
            select: { program: { select: { title: true } }, position: true },
            take: 1,
          },
          internEvaluation: {
            select: { finalScore: true },
          },
        },
      },
    },
  });

  const isValid = !!certificate;
  const programTitle = certificate?.user.applications[0]?.program.title ?? "—";
  const position     = certificate?.user.applications[0]?.position ?? "—";
  const finalScore   = certificate?.user.internEvaluation?.finalScore;
  const issuedDate   = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-lexa.png" alt="LEXA Technology" className="h-10 w-auto" />
        </div>

        {isValid ? (
          /* ── Valid ── */
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden">
            <div className="bg-emerald-50 px-6 py-5 flex items-center gap-4 border-b border-emerald-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="font-bold text-emerald-800 text-lg">Sertifikat Terverifikasi</h1>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Dokumen ini terdaftar dan sah di sistem LEXA Internship
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                ["Nama Peserta",    certificate.user.name ?? "—"],
                ["Program Magang",  programTitle],
                ["Posisi",          position],
                ["Nomor Sertifikat", certificate.certNumber],
                ["Tanggal Terbit",  issuedDate],
                ...(finalScore !== undefined && finalScore !== null
                  ? [["Nilai Akhir", `${finalScore.toFixed(1)} / 100`] as [string, string]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-start gap-2">
                <Award className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sertifikat ini diterbitkan secara sah oleh{" "}
                  <span className="font-semibold text-slate-700">LEXA Software House</span> melalui
                  Sistem Manajemen Internship resmi.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Invalid ── */
          <div className="bg-white rounded-2xl border border-red-100 shadow-lg overflow-hidden">
            <div className="bg-red-50 px-6 py-5 flex items-center gap-4 border-b border-red-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="font-bold text-red-800 text-lg">Sertifikat Tidak Valid</h1>
                <p className="text-xs text-red-600 mt-0.5">
                  Dokumen tidak terdaftar di sistem LEXA Internship
                </p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-500 leading-relaxed">
                Nomor sertifikat <span className="font-mono font-semibold text-slate-700">{certNumber}</span> tidak
                ditemukan. Dokumen ini mungkin tidak sah atau nomor yang dimasukkan salah.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 LEXA Software House •{" "}
          <Link href="/" className="hover:text-blue-600 transition">
            Kembali ke Beranda
          </Link>
        </p>
      </div>
    </main>
  );
}
