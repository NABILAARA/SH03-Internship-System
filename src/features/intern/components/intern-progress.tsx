"use client";

import { Clock, TrendingUp, CheckCircle, XCircle, ClipboardList } from "lucide-react";

type LogbookEntry = {
  id: string;
  date: Date;
  activity: string;
  progress: number;
  projectProgress: number;
  status: string;
  feedback: string | null;
};

type EvaluationData = {
  finalScore: number;
  technicalScore: number;
  attitudeScore: number;
  communicationScore: number;
  attendanceScore: number;
  notes: string | null;
};

type ProgressData = {
  logbooks: LogbookEntry[];
  evaluation: EvaluationData | null;
  application: { program: { title: string; period: string | null } } | null;
  stats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    avgProgress: number;
    latestProjectProgress: number;
  };
};

type InternProgressProps = { data: ProgressData };

function ScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function ScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function InternProgress({ data }: Readonly<InternProgressProps>) {
  const { logbooks, evaluation, application, stats } = data;

  // Most-recent-first for display
  const sortedLogbooks = [...logbooks].reverse();

  const approvedPct = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
  const pendingPct = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
  const rejectedPct = stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-7 w-7" />
              Progress &amp; Analitik
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Pantau perkembangan magang Anda secara menyeluruh.
            </p>
          </div>
          {application && (
            <span className="inline-block bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-semibold text-white self-start sm:self-auto">
              {application.program.title}
              {application.program.period ? ` · ${application.program.period}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="rounded-xl p-3 bg-blue-50 text-blue-600 shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Logbook</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="rounded-xl p-3 bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disetujui</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="rounded-xl p-3 bg-red-50 text-red-500 shrink-0">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ditolak</p>
            <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="rounded-xl p-3 bg-amber-50 text-amber-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-800">Ringkasan Progress</h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Big number — overall project progress terbaru */}
          <div className="flex flex-col items-center justify-center bg-violet-50 rounded-2xl px-8 py-5 shrink-0">
            <span className="text-5xl font-extrabold text-violet-600">{stats.latestProjectProgress}%</span>
            <span className="text-xs text-violet-400 font-semibold mt-1 uppercase tracking-wider">Overall Progress</span>
          </div>

          <div className="flex-1 space-y-4">
            {/* Overall project progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Estimasi Progress Keseluruhan Proyek</span>
                <span className="text-violet-600">{stats.latestProjectProgress}%</span>
              </div>
              <div className="w-full bg-violet-100 h-4 rounded-full overflow-hidden">
                <div
                  className="h-4 rounded-full bg-violet-500 transition-all duration-700"
                  style={{ width: `${stats.latestProjectProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Berdasarkan laporan logbook terakhir yang dikirim.
              </p>
            </div>

            {/* Status breakdown bar */}
            {stats.total > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Distribusi Status</p>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div
                    className="h-3 bg-emerald-500 transition-all duration-700"
                    style={{ width: `${approvedPct}%` }}
                  />
                  <div
                    className="h-3 bg-amber-400 transition-all duration-700"
                    style={{ width: `${pendingPct}%` }}
                  />
                  <div
                    className="h-3 bg-red-400 transition-all duration-700"
                    style={{ width: `${rejectedPct}%` }}
                  />
                </div>
                <div className="flex gap-4 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />Disetujui ({stats.approved})</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />Pending ({stats.pending})</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />Ditolak ({stats.rejected})</span>
                </div>
              </div>
            )}

            <p className="text-sm text-slate-600">
              <span className="font-bold text-emerald-600">{stats.approved}</span> dari{" "}
              <span className="font-bold text-slate-800">{stats.total}</span> logbook telah disetujui mentor
            </p>
          </div>
        </div>
      </div>

      {/* Logbook Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Timeline Logbook</h2>

        {sortedLogbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <ClipboardList className="h-10 w-10 mb-2" />
            <p className="text-sm font-medium">Tidak ada logbook</p>
            <p className="text-xs mt-1">Mulai isi logbook harian Anda dari menu Logbook.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLogbooks.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/60 border border-slate-100 rounded-xl p-4"
              >
                {/* Date */}
                <div className="shrink-0 text-xs text-slate-500 font-semibold min-w-[7rem]">
                  {new Date(log.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </div>

                {/* Activity */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2">{log.activity}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-[120px] bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-blue-500 rounded-full"
                          style={{ width: `${log.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">{log.progress}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-[120px] bg-violet-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-violet-500 rounded-full"
                          style={{ width: `${log.projectProgress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-violet-500 font-medium">{log.projectProgress}% proyek</span>
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-start sm:self-center ${
                    log.status === "approved"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : log.status === "rejected"
                      ? "bg-red-50 text-red-500 border border-red-100"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}
                >
                  {log.status === "approved"
                    ? "Disetujui"
                    : log.status === "rejected"
                    ? "Ditolak"
                    : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation */}
      {evaluation ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-800">Evaluasi Nilai</h2>

          {/* Final Score */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl px-8 py-5 shrink-0 border border-slate-100">
              <span className={`text-5xl font-extrabold ${ScoreColor(evaluation.finalScore)}`}>
                {Math.round(evaluation.finalScore)}
              </span>
              <span className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Nilai Akhir</span>
            </div>

            <div className="flex-1 space-y-3">
              {/* Score rows */}
              {[
                { label: "Teknis", score: evaluation.technicalScore },
                { label: "Sikap", score: evaluation.attitudeScore },
                { label: "Komunikasi", score: evaluation.communicationScore },
                { label: "Kehadiran", score: evaluation.attendanceScore }
              ].map(({ label, score }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-24 shrink-0">{label}</span>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${ScoreBarColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right shrink-0 ${ScoreColor(score)}`}>
                    {Math.round(score)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {evaluation.notes && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Catatan Mentor</p>
              <p className="text-sm text-slate-700 italic">&quot;{evaluation.notes}&quot;</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 shrink-0">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-800">Belum Dievaluasi</h3>
            <p className="text-sm text-amber-700 mt-1">
              Evaluasi nilai belum tersedia. Mentor akan memberikan penilaian setelah periode magang selesai.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
