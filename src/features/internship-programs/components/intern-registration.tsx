"use client";

import { useState } from "react";
import { Briefcase, Link as LinkIcon, Send, X, CheckCircle, Clock, AlertTriangle, HelpCircle, RefreshCw } from "lucide-react";
import { applyForProgramAction, resubmitApplicationAction } from "../services/application.actions";
import { Button } from "@/components/ui/button";

type Program = {
  id: string;
  title: string;
  description: string;
  status: string;
  period: string | null;
};

type Application = {
  id: string;
  programId: string;
  status: string;
  position: string | null;
  cvUrl: string | null;
  notes: string | null;
  createdAt: Date;
  program: Program;
};

type InternRegistrationProps = {
  programs: Program[];
  applications: Application[];
};

const INTERNSHIP_POSITIONS = [
  "UI/UX Designer",
  "Frontend Web Developer",
  "Backend Engineer",
  "QA/Software Tester & Documentation",
  "Repository E-Prints",
  "Social Media Specialist",
  "Corporate Identity Designer",
  "AI & Security Engineer",
  "DevOps Engineer",
  "AI/LM Engineer",
  "Academic Publishing Intern",
  "Branding and Graphic Designer",
] as const;

export function InternRegistration({ programs, applications: initialApps }: Readonly<InternRegistrationProps>) {
  const [applications, setApplications] = useState<Application[]>(initialApps);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [position, setPosition] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resubmitApp, setResubmitApp] = useState<Application | null>(null);
  const [resubmitPosition, setResubmitPosition] = useState("");
  const [resubmitCvUrl, setResubmitCvUrl] = useState("");
  const [resubmitNotes, setResubmitNotes] = useState("");
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const handleOpenForm = (program: Program) => {
    setSelectedProgram(program);
    setPosition("");
    setCvUrl("");
    setNotes("");
    setError(null);
    setSuccess(false);
  };

  const handleCloseForm = () => {
    setSelectedProgram(null);
  };

  const handleOpenResubmit = (app: Application) => {
    setResubmitApp(app);
    setResubmitPosition(app.position ?? "");
    setResubmitCvUrl(app.cvUrl ?? "");
    setResubmitNotes(app.notes ?? "");
    setResubmitError(null);
    setResubmitSuccess(false);
  };

  const handleCloseResubmit = () => {
    setResubmitApp(null);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitApp) return;
    if (!resubmitPosition) {
      setResubmitError("Posisi yang dilamar wajib dipilih.");
      return;
    }
    if (!resubmitCvUrl) {
      setResubmitError("Link CV wajib diisi.");
      return;
    }
    setIsResubmitting(true);
    setResubmitError(null);
    try {
      const res = await resubmitApplicationAction({
        applicationId: resubmitApp.id,
        position: resubmitPosition,
        cvUrl: resubmitCvUrl,
        notes: resubmitNotes
      });
      if (res.error) {
        setResubmitError(res.error);
      } else {
        setResubmitSuccess(true);
        setApplications((prev) =>
          prev.map((a) =>
            a.id === resubmitApp.id
              ? { ...a, status: "pending", position: resubmitPosition, cvUrl: resubmitCvUrl, notes: resubmitNotes }
              : a
          )
        );
        setTimeout(() => setResubmitApp(null), 1500);
      }
    } catch (err) {
      console.error(err);
      setResubmitError("Gagal mengirim ulang pendaftaran.");
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;
    if (!position) {
      setError("Posisi yang dilamar wajib dipilih.");
      return;
    }
    if (!cvUrl) {
      setError("Link CV wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await applyForProgramAction({
        programId: selectedProgram.id,
        position,
        cvUrl,
        notes
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        const newApp: Application = {
          id: Math.random().toString(),
          programId: selectedProgram.id,
          status: "pending",
          position,
          cvUrl,
          notes,
          createdAt: new Date(),
          program: selectedProgram
        };
        setApplications((prev) => [newApp, ...prev]);
        setTimeout(() => setSelectedProgram(null), 1500);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal mengirim pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasApprovedApplication = applications.some((a) => a.status === "approved");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800 font-sans">Pendaftaran Program Magang</h1>
        <p className="text-sm text-slate-500">Pilih program magang aktif yang sesuai dengan keahlian Anda.</p>
      </div>

      {/* Applications Status Panel */}
      {applications.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Status Pendaftaran Saya</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm md:text-base">
                        {app.program.title}
                      </h3>
                      {app.position && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          Posisi: {app.position}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                        app.status === "approved"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : app.status === "rejected"
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {app.status === "approved" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : app.status === "rejected" ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>
                        {app.status === "approved"
                          ? "Diterima"
                          : app.status === "rejected"
                          ? "Ditolak"
                          : "Pending"}
                      </span>
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                    <span>Terdaftar pada:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(app.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </p>
                </div>
                {app.cvUrl && (
                  <a
                    href={app.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold self-start"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Lihat CV yang Dikirim</span>
                  </a>
                )}
                {app.status === "rejected" && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenResubmit(app)}
                    className="mt-2 self-start bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Edit &amp; Kirim Ulang
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Program Vacancy List — only shown if not yet accepted */}
      {!hasApprovedApplication && (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <span>Daftar Program Magang Aktif</span>
        </h2>

        {programs.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Tidak ada program magang yang aktif saat ini.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan hubungi administrator untuk ketersediaan magang.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => {
              // Check if user already applied to this program
              const isApplied = applications.some((app) => app.programId === program.id);
              
              return (
                <div
                  key={program.id}
                  className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{program.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{program.period}</p>
                    <p className="text-slate-600 text-sm mb-6 line-clamp-3">
                      {program.description}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleOpenForm(program)}
                    disabled={isApplied}
                    className={`w-full font-medium ${
                      isApplied
                        ? "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    }`}
                  >
                    {isApplied ? "Sudah Mendaftar" : "Daftar Sekarang"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* Banner — already accepted */}
      {hasApprovedApplication && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Anda sudah diterima di program magang</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Pendaftaran ke program lain tidak tersedia karena Anda sudah aktif sebagai peserta magang. Fokus pada program yang sedang berjalan.
            </p>
          </div>
        </div>
      )}
      {/* Application Form Drawer/Modal Overlay */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 p-6 shadow-2xl space-y-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Formulir Pendaftaran Magang</h3>
                <p className="text-xs text-slate-500">Program: {selectedProgram.title}</p>
              </div>
              <button
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <CheckCircle className="h-14 w-14 text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-slate-800 text-lg">Pendaftaran Berhasil Dikirim!</h4>
                <p className="text-sm text-slate-500">Pendaftaran Anda sedang diproses oleh administrator.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dropdown posisi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="position">
                    Posisi yang Dilamar <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  >
                    <option value="">-- Pilih Posisi --</option>
                    {INTERNSHIP_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="cv-link">
                    Link CV (Google Drive / PDF Online)
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="cv-link"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={cvUrl}
                      onChange={(e) => setCvUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Pastikan izin akses dokumen diatur ke &quot;Anyone with link&quot; (publik).</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="cv-notes">
                    Catatan Tambahan / Motivasi (Opsional)
                  </label>
                  <textarea
                    id="cv-notes"
                    rows={3}
                    placeholder="Mengapa Anda tertarik dengan posisi ini? Sebutkan pengalaman relevan Anda..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseForm}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 font-medium text-white flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      "Mengirim..."
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim Pendaftaran</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Resubmit Modal */}
      {resubmitApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 p-6 shadow-2xl space-y-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit &amp; Kirim Ulang Pendaftaran</h3>
                <p className="text-xs text-slate-500">Posisi: {resubmitApp.program.title}</p>
              </div>
              <button
                onClick={handleCloseResubmit}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resubmitSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <CheckCircle className="h-14 w-14 text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-slate-800 text-lg">Pendaftaran Berhasil Dikirim Ulang!</h4>
                <p className="text-sm text-slate-500">Pendaftaran Anda sedang diproses kembali oleh administrator.</p>
              </div>
            ) : (
              <form onSubmit={handleResubmit} className="space-y-4">
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                  Perbarui posisi dan link CV Anda lalu kirim ulang. Status akan kembali ke <strong>Pending</strong> untuk ditinjau admin.
                </div>

                {resubmitError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{resubmitError}</span>
                  </div>
                )}

                {/* Dropdown posisi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="resubmit-position">
                    Posisi yang Dilamar <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="resubmit-position"
                    value={resubmitPosition}
                    onChange={(e) => setResubmitPosition(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  >
                    <option value="">-- Pilih Posisi --</option>
                    {INTERNSHIP_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="resubmit-cv-link">
                    Link CV (Google Drive / PDF Online)
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="resubmit-cv-link"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={resubmitCvUrl}
                      onChange={(e) => setResubmitCvUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Pastikan izin akses dokumen diatur ke &quot;Anyone with link&quot; (publik).</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="resubmit-notes">
                    Catatan Tambahan / Motivasi (Opsional)
                  </label>
                  <textarea
                    id="resubmit-notes"
                    rows={3}
                    placeholder="Perbarui motivasi atau catatan Anda..."
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseResubmit}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isResubmitting}
                    className="bg-blue-600 hover:bg-blue-700 font-medium text-white flex items-center gap-1.5"
                  >
                    {isResubmitting ? (
                      "Mengirim..."
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim Ulang</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
