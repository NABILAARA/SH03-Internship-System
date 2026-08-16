"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Github,
  GitCommitHorizontal,
  Loader2,
  Wand2,
  ChevronDown,
  ChevronUp,
  BookMarked,
  ArrowRight,
  Pencil,
  UserX,
  UserCheck,
  Save
} from "lucide-react";
import { createLogbookAction, resubmitLogbookAction } from "../services/logbook.actions";
import {
  fetchGithubReposAction,
  fetchGithubCommitsAction,
  type GithubRepo,
  type GithubCommit
} from "../services/github.actions";
import { Button } from "@/components/ui/button";

type LogbookEntry = {
  id: string;
  date: Date;
  activity: string;
  progress: number;
  projectProgress: number;
  status: string;
  feedback: string | null;
};

type InternLogbookProps = {
  initialLogbooks: LogbookEntry[];
  hasMentor: boolean;
  mentorName: string | null;
};

// GitHub import steps
type GithubStep = "idle" | "picking-repo" | "fetching-commits" | "done";

export function InternLogbook({ initialLogbooks, hasMentor, mentorName }: Readonly<InternLogbookProps>) {
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>(initialLogbooks);
  const today = new Date().toISOString().split("T")[0];
  const [isAdding, setIsAdding] = useState(false);
  const [activity, setActivity] = useState("");
  const [progress, setProgress] = useState(50);
  const [projectProgress, setProjectProgress] = useState(0);
  const [logDate, setLogDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft state
  const DRAFT_KEY = "intern-logbook-draft";
  const [draftSaved, setDraftSaved] = useState(false);

  // Save draft manual ke localStorage — tidak dikirim ke mentor
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ activity, progress, projectProgress, logDate }));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch { /* ignore */ }
  };

  // Load draft saat form dibuka
  const openAddForm = () => {
    setIsAdding(true);
    resetGithub();
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as { activity?: string; progress?: number; projectProgress?: number; logDate?: string };
        if (draft.activity)  setActivity(draft.activity);
        if (draft.progress !== undefined) setProgress(draft.progress);
        if (draft.projectProgress !== undefined) setProjectProgress(draft.projectProgress);
        if (draft.logDate)   setLogDate(draft.logDate);
      }
    } catch { /* ignore */ }
  };

  // Hapus draft setelah submit berhasil
  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  // GitHub import states
  const [githubStep, setGithubStep] = useState<GithubStep>("idle");

  // Resubmit state — holds the rejected logbook being edited
  const [editingLog, setEditingLog]           = useState<LogbookEntry | null>(null);
  const [editActivity, setEditActivity]       = useState("");
  const [editProgress, setEditProgress]       = useState(50);
  const [editProjectProgress, setEditProjectProgress] = useState(0);
  const [editDate, setEditDate]               = useState(today);
  const [editError, setEditError]             = useState<string | null>(null);
  const [editSuccess, setEditSuccess]         = useState(false);
  const [isResubmitting, setIsResubmitting]   = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(""); // full_name e.g. "user/repo"
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubCommits, setGithubCommits] = useState<GithubCommit[] | null>(null);
  const [showCommits, setShowCommits] = useState(true);

  const resetGithub = () => {
    setGithubStep("idle");
    setGithubLoading(false);
    setGithubError(null);
    setRepos([]);
    setSelectedRepo("");
    setGithubCommits(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) {
      setError("Deskripsi aktivitas tidak boleh kosong.");
      return;
    }
    if (progress < 100) {
      setError("Logbook bisa disubmit ketika sudah 100 persen pengerjaan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createLogbookAction({ activity, progress, projectProgress, date: logDate });
      if (res.error) {
        setError(res.error);
      } else {
        clearDraft(); // hapus draft setelah submit berhasil
        const newLog: LogbookEntry = {
          id: Math.random().toString(),
          date: logDate ? new Date(logDate) : new Date(),
          activity,
          progress,
          projectProgress,
          status: "pending",
          feedback: null
        };
        setLogbooks((prev) => [newLog, ...prev]);
        setActivity("");
        setProgress(50);
        setProjectProgress(0);
        setLogDate(today);
        setIsAdding(false);
        resetGithub();
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan logbook.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Fetch commits from selected repo
  const handleFetchCommits = async (repoToFetch: string = selectedRepo, dateToFetch: string = logDate) => {
    if (!repoToFetch) {
      setGithubError("Pilih repository terlebih dahulu.");
      return;
    }

    setGithubLoading(true);
    setGithubError(null);
    setGithubStep("fetching-commits");

    try {
      const result = await fetchGithubCommitsAction(dateToFetch, repoToFetch);

      if (result.error) {
        setGithubError(result.error);
        setGithubStep("picking-repo");
      } else {
        setGithubCommits(result.commits ?? []);
        setGithubStep("done");

        // Auto-fill textarea if commits found
        if (result.commits && result.commits.length > 0) {
          const lines = result.commits.map(
            (c) => `[${c.timestamp}] ${c.repo.split("/")[1] ?? c.repo}: ${c.message}`
          );
          setActivity(lines.join("\n"));
        }
      }
    } catch {
      setGithubError("Terjadi kesalahan jaringan atau server saat mengambil commit.");
      setGithubStep("picking-repo");
    } finally {
      setGithubLoading(false);
    }
  };

  // Step 1: Fetch repo list
  const handleFetchRepos = async () => {
    setGithubLoading(true);
    setGithubError(null);
    setGithubCommits(null);
    setSelectedRepo("");

    try {
      const result = await fetchGithubReposAction();

      if (result.error) {
        setGithubError(result.error);
        setGithubStep("idle");
      } else {
        const fetchedRepos = result.repos ?? [];
        setRepos(fetchedRepos);
        setGithubUsername(result.username ?? null);

        // Auto-select previously chosen repository if it still exists
        const lastRepo = localStorage.getItem("internship-system-last-repo");
        if (lastRepo && fetchedRepos.some((r) => r.name === lastRepo)) {
          setSelectedRepo(lastRepo);
          // Automatically fetch commits immediately
          await handleFetchCommits(lastRepo, logDate);
        } else {
          setGithubStep("picking-repo");
        }
      }
    } catch {
      setGithubError("Terjadi kesalahan jaringan atau server saat mengambil repositori.");
      setGithubStep("idle");
    } finally {
      setGithubLoading(false);
    }
  };



  const handleApplyCommits = () => {
    if (!githubCommits || githubCommits.length === 0) return;
    const lines = githubCommits.map(
      (c) => `[${c.timestamp}] ${c.repo.split("/")[1] ?? c.repo}: ${c.message}`
    );
    setActivity(lines.join("\n"));
  };

  const closeForm = () => {
    setIsAdding(false);
    setActivity("");
    setProgress(50);
    setProjectProgress(0);
    setLogDate(today);
    resetGithub();
  };

  const handleOpenEdit = (log: LogbookEntry) => {
    setEditingLog(log);
    setEditActivity(log.activity);
    setEditProgress(log.progress);
    setEditProjectProgress(log.projectProgress);
    setEditDate(new Date(log.date).toISOString().split("T")[0]);
    setEditError(null);
    setEditSuccess(false);
  };

  const handleCloseEdit = () => {
    setEditingLog(null);
    setEditError(null);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    if (!editActivity) { setEditError("Deskripsi aktivitas tidak boleh kosong."); return; }

    if (editProgress < 100) {
      setEditError("Logbook bisa disubmit ketika sudah 100 persen pengerjaan.");
      return;
    }

    setIsResubmitting(true);
    setEditError(null);
    try {
      const res = await resubmitLogbookAction({
        logbookId: editingLog.id,
        activity: editActivity,
        progress: editProgress,
        projectProgress: editProjectProgress,
        date: editDate
      });
      if (res.error) {
        setEditError(res.error);
      } else {
        setEditSuccess(true);
        setLogbooks((prev) =>
          prev.map((l) =>
            l.id === editingLog.id
              ? { ...l, activity: editActivity, progress: editProgress, projectProgress: editProjectProgress, status: "pending", feedback: null, date: new Date(editDate) }
              : l
          )
        );
        setTimeout(() => setEditingLog(null), 1500);
      }
    } catch {
      setEditError("Terjadi kesalahan sistem.");
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <span>Logbook Harian</span>
          </h1>
          <p className="text-sm text-slate-500">
            Laporkan aktivitas magang harian Anda dan pantau evaluasi mentor.
          </p>
        </div>
        {!isAdding && hasMentor && (
          <Button
            onClick={openAddForm}
            className="bg-blue-600 hover:bg-blue-700 font-medium text-white flex items-center gap-2 self-start"
          >
            <Plus className="h-4 w-4" />
            <span>Isi Logbook Hari Ini</span>
          </Button>
        )}
      </div>

      {/* Banner — belum punya mentor */}
      {!hasMentor && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <UserX className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Mentor belum ditugaskan</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Anda belum dapat mengisi logbook. Admin perlu menugaskan mentor kepada Anda terlebih dahulu sebelum bisa melaporkan aktivitas harian.
            </p>
          </div>
        </div>
      )}

      {/* Banner — sudah punya mentor */}
      {hasMentor && mentorName && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            Dibimbing oleh <span className="font-semibold">{mentorName}</span> — logbook Anda akan ditinjau oleh mentor ini.
          </p>
        </div>
      )}

      {/* Add Logbook Form Panel */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Isi Aktivitas Harian</h2>
              {(() => {
                try {
                  return localStorage.getItem(DRAFT_KEY)
                    ? <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Draft tersimpan</span>
                    : null;
                } catch { return null; }
              })()}
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="log-date">
              Tanggal Aktivitas
            </label>
            <input
              id="log-date"
              type="date"
              value={logDate}
              max={today}
              onChange={(e) => {
                const newDate = e.target.value;
                setLogDate(newDate);
                // If a repo is already selected, auto-fetch for the new date
                if (selectedRepo && githubStep !== "idle") {
                  handleFetchCommits(selectedRepo, newDate);
                }
              }}
              className="w-full max-w-xs rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* ───── GitHub Import Section ───── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-semibold text-slate-700">
                  Import Otomatis dari GitHub
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold rounded-full px-2 py-0.5 uppercase tracking-wide">
                  Baru
                </span>
              </div>
              {githubStep === "done" && githubCommits !== null && (
                <button
                  type="button"
                  onClick={() => setShowCommits((p) => !p)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  {showCommits ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Tarik riwayat commit dari repository GitHub spesifik dan jadikan sebagai isi logbook.
            </p>

            {/* ── STEP INDICATOR ── */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`font-semibold ${githubStep !== "idle" ? "text-blue-600" : "text-slate-400"}`}>
                1. Pilih Repository
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className={`font-semibold ${githubStep === "done" || githubStep === "fetching-commits" ? "text-blue-600" : "text-slate-400"}`}>
                2. Ambil Commit
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className={`font-semibold ${githubStep === "done" ? "text-emerald-600" : "text-slate-400"}`}>
                3. Terapkan
              </span>
            </div>

            {/* Error display */}
            {githubError && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{githubError}</span>
              </div>
            )}

            {/* ── STEP 1: Load Repos button / Repo Picker ── */}
            {(githubStep === "idle" || githubStep === "picking-repo") && (
              <div className="space-y-3">
                {githubStep === "idle" && (
                  <Button
                    type="button"
                    onClick={handleFetchRepos}
                    disabled={githubLoading}
                    variant="outline"
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-sm font-medium flex items-center gap-2 w-full sm:w-auto"
                  >
                    {githubLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookMarked className="h-4 w-4" />
                    )}
                    {githubLoading ? "Memuat repository..." : "Muat Daftar Repository"}
                  </Button>
                )}

                {githubStep === "picking-repo" && repos.length > 0 && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="repo-select">
                        Pilih Repository — @{githubUsername} ({repos.length} repo publik)
                      </label>
                      <select
                        id="repo-select"
                        value={selectedRepo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRepo(val);
                          if (val) {
                            localStorage.setItem("internship-system-last-repo", val);
                            handleFetchCommits(val, logDate); // Auto-fetch on select
                          } else {
                            localStorage.removeItem("internship-system-last-repo");
                            setGithubCommits(null);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                      >
                        <option value="">-- Pilih repository --</option>
                        {repos.map((repo) => (
                          <option key={repo.name} value={repo.name}>
                            {repo.displayName}
                            {repo.description ? ` — ${repo.description.slice(0, 40)}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetGithub}
                        className="text-xs text-slate-400 hover:text-slate-600 transition underline"
                      >
                        Reset / Muat Ulang Daftar Repo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Commit Preview ── */}
            {githubStep === "done" && githubCommits !== null && showCommits && (
              <div className="space-y-2 pt-1">
                {githubCommits.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-400">
                    <GitCommitHorizontal className="h-8 w-8 mx-auto mb-1 opacity-40" />
                    <p>Tidak ada commit pada tanggal ini</p>
                    <p className="text-xs mt-0.5">
                      di repository{" "}
                      <span className="font-bold text-slate-600">{selectedRepo.split("/")[1]}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setGithubStep("picking-repo")}
                      className="mt-2 text-xs text-blue-500 hover:underline"
                    >
                      ← Pilih repository lain
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {githubCommits.length} commit — {selectedRepo.split("/")[1]}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setGithubStep("picking-repo")}
                          className="text-xs text-slate-400 hover:text-slate-600 transition underline"
                        >
                          ← Ganti repo
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyCommits}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                          <Wand2 className="h-3 w-3" />
                          Terapkan ke Logbook
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {githubCommits.map((commit) => (
                        <div
                          key={commit.sha}
                          className="flex items-start gap-2.5 bg-white border border-slate-100 rounded-lg p-2.5"
                        >
                          <GitCommitHorizontal className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">
                              {commit.message}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">{commit.timestamp}</span>
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] font-mono text-slate-400">{commit.sha}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Activity textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700" htmlFor="log-activity">
                Detail Aktivitas / Pekerjaan
              </label>
              {githubStep === "done" && githubCommits && githubCommits.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Terisi dari GitHub
                </span>
              )}
            </div>
            <textarea
              id="log-activity"
              rows={5}
              placeholder="Jelaskan apa yang Anda kerjakan hari ini, atau gunakan tombol Import GitHub di atas untuk mengisi otomatis..."
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-mono"
            />
          </div>

          {/* Progress slider — tugas hari ini */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <label htmlFor="log-progress">Progress Tugas Harian</label>
              <span className="text-blue-600 font-bold">{progress}% Completed</span>
            </div>
            <input
              id="log-progress"
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 px-1">
              <span>0% (Baru Mulai)</span>
              <span>50% (Setengah Jalan)</span>
              <span>100% (Selesai)</span>
            </div>
          </div>

          {/* Project Progress slider — estimasi keseluruhan proyek */}
          <div className="space-y-1.5 rounded-xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <label htmlFor="log-project-progress">
                Estimasi Progress Keseluruhan Proyek
              </label>
              <span className="text-violet-600 font-bold">{projectProgress}%</span>
            </div>
            <input
              id="log-project-progress"
              type="range"
              min="0"
              max="100"
              step="5"
              value={projectProgress}
              onChange={(e) => setProjectProgress(Number(e.target.value))}
              className="w-full h-2 bg-violet-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 px-1">
              <span>0%</span>
              <span>50%</span>
              <span>100% (Selesai Total)</span>
            </div>
            <p className="text-[11px] text-violet-600 mt-1">
              Seberapa jauh pengerjaan <strong>keseluruhan proyek magang</strong> Anda saat ini? Ini terpisah dari progress tugas hari ini.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 font-medium gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {draftSaved ? "Tersimpan ✓" : "Simpan Draft"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 font-medium text-white"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Logbook"}
            </Button>
          </div>
        </form>
      )}

      {/* Logbook History */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Riwayat Logbook</h2>

        {logbooks.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Belum ada laporan aktivitas.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klik tombol di atas untuk melaporkan aktivitas pertama Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logbooks.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition duration-200 animate-in fade-in duration-300"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      {new Date(log.date).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 self-start sm:self-center ${
                      log.status === "approved"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : log.status === "rejected"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}
                  >
                    {log.status === "approved" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : log.status === "rejected" ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span>
                      {log.status === "approved"
                        ? "Disetujui"
                        : log.status === "rejected"
                        ? "Ditolak"
                        : "Menunggu Review"}
                    </span>
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{log.activity}</p>

                  {/* Progress keseluruhan proyek */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progress Keseluruhan Proyek</span>
                      <span className="font-bold text-violet-600">{log.projectProgress}%</span>
                    </div>
                    <div className="w-full bg-violet-100 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${log.projectProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {log.feedback && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start gap-2.5">
                    <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Catatan Pembimbing:
                      </p>
                      <p className="text-xs text-slate-700 italic">&quot;{log.feedback}&quot;</p>
                    </div>
                  </div>
                )}

                {log.status === "rejected" && hasMentor && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(log)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit &amp; Kirim Ulang
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit & Resubmit Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit &amp; Kirim Ulang Logbook</h3>
                <p className="text-xs text-slate-400 mt-0.5">Perbarui isi logbook lalu kirim ulang untuk ditinjau mentor.</p>
              </div>
              <button onClick={handleCloseEdit} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {editSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 px-6">
                <CheckCircle className="h-14 w-14 text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-slate-800 text-lg">Logbook Berhasil Dikirim Ulang!</h4>
                <p className="text-sm text-slate-500">Menunggu tinjauan ulang dari mentor.</p>
              </div>
            ) : (
              <form onSubmit={handleResubmit} className="p-6 space-y-4">
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                  Status akan kembali ke <strong>Menunggu Review</strong> setelah dikirim ulang.
                </div>

                {editError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="edit-date">Tanggal Aktivitas</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    max={today}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="edit-activity">Detail Aktivitas</label>
                  <textarea
                    id="edit-activity"
                    rows={5}
                    value={editActivity}
                    onChange={(e) => setEditActivity(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-mono resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="edit-progress">Progress Tugas Harian</label>
                    <span className="text-blue-600 font-bold">{editProgress}%</span>
                  </div>
                  <input
                    id="edit-progress"
                    type="range"
                    min="0" max="100" step="5"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-1.5 rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="edit-project-progress">Estimasi Progress Keseluruhan Proyek</label>
                    <span className="text-violet-600 font-bold">{editProjectProgress}%</span>
                  </div>
                  <input
                    id="edit-project-progress"
                    type="range"
                    min="0" max="100" step="5"
                    value={editProjectProgress}
                    onChange={(e) => setEditProjectProgress(Number(e.target.value))}
                    className="w-full h-2 bg-violet-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <p className="text-[11px] text-violet-600">
                    Seberapa jauh pengerjaan <strong>keseluruhan proyek magang</strong> Anda saat ini?
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={handleCloseEdit} className="text-slate-600">
                    Batal
                  </Button>
                  <Button type="submit" disabled={isResubmitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    {isResubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
                    ) : (
                      "Kirim Ulang"
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
