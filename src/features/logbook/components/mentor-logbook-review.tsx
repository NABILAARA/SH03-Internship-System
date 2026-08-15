"use client";

import { useState } from "react";
import {
  ClipboardList, Calendar, Check, X,
  Search, MessageSquare, CheckCircle, XCircle,
} from "lucide-react";
import { reviewLogbookAction } from "../services/logbook.actions";
import { Button } from "@/components/ui/button";

/* ─── Types ─────────────────────────────────────────── */
type Intern = {
  id: string;
  name: string | null;
  email: string;
};

type LogbookEntry = {
  id: string;
  userId: string;
  date: Date;
  activity: string;
  progress: number;
  status: string;
  feedback: string | null;
  user: Intern;
};

type MentorLogbookReviewProps = {
  initialLogbooks: LogbookEntry[];
};

/* ─── Avatar helpers ────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-rose-500", "bg-indigo-500", "bg-amber-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string | null) {
  if (!name) return "??";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ─── Component ─────────────────────────────────────── */
export function MentorLogbookReview({ initialLogbooks }: Readonly<MentorLogbookReviewProps>) {
  const [logbooks, setLogbooks]         = useState<LogbookEntry[]>(initialLogbooks);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchQuery, setSearchQuery]   = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setSubmittingId(id);
    const feedback = feedbackNotes[id] ?? "";
    try {
      const res = await reviewLogbookAction(id, status, feedback);
      if (!res.error) {
        setLogbooks(prev =>
          prev.map(log => log.id === id ? { ...log, status, feedback } : log)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  };

  /* Counts for tabs */
  const counts = {
    all:      logbooks.length,
    pending:  logbooks.filter(l => l.status === "pending").length,
    approved: logbooks.filter(l => l.status === "approved").length,
    rejected: logbooks.filter(l => l.status === "rejected").length,
  };

  const filteredLogs = logbooks.filter(log => {
    const matchStatus = filterStatus === "all" || log.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (log.user.name?.toLowerCase().includes(q) ?? false) ||
      log.activity.toLowerCase().includes(q) ||
      log.user.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const tabs = [
    { id: "all",      label: "All",            count: counts.all },
    { id: "pending",  label: "Pending Review",  count: counts.pending },
    { id: "approved", label: "Approved",        count: counts.approved },
    { id: "rejected", label: "Rejected",        count: counts.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Review Intern Logbooks</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Review and provide feedback on daily activity reports submitted by your mentees to
          ensure their learning objectives are being met.
        </p>
      </div>

      {/* Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by intern name or activity detail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filterStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Logbook Cards */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-14 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Tidak ada logbook yang cocok.</p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const name       = log.user.name ?? "Tanpa Nama";
            const color      = avatarColor(name);
            const ini        = initials(log.user.name);
            const isPending  = log.status === "pending";
            const isApproved = log.status === "approved";
            const isSubmitting = submittingId === log.id;

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition duration-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${color}`}>
                      {ini}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{name}</p>
                      <p className="text-xs text-slate-400">{log.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {!isPending && (
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-600"
                      }`}>
                        {isApproved
                          ? <CheckCircle className="h-3 w-3" />
                          : <XCircle className="h-3 w-3" />}
                        {isApproved ? "Approved" : "Rejected"}
                      </span>
                    )}
                    {isPending && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                        Pending Review
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(log.date).toLocaleDateString("en-US", {
                          weekday: "short", month: "long", day: "numeric", year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Reported Activities */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Reported Activities
                      </p>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                        <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                          {log.activity}
                        </p>
                      </div>
                    </div>

                    {/* Report Progress */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Report Progress
                      </p>
                      <div className="space-y-2 pt-1">
                        <p className="text-sm font-semibold text-slate-700">
                          {log.progress}% Complete
                        </p>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${log.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action / Feedback section */}
                  <div className="mt-5">
                    {isPending ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Provide Feedback / Mentor Notes
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <input
                            type="text"
                            placeholder="e.g., Great job, make sure the code is committed..."
                            value={feedbackNotes[log.id] ?? ""}
                            onChange={e => setFeedbackNotes(prev => ({ ...prev, [log.id]: e.target.value }))}
                            className="flex-1 rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                          />
                          <div className="flex gap-2 shrink-0">
                            <Button
                              onClick={() => handleReview(log.id, "approved")}
                              disabled={isSubmitting}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold text-sm px-5"
                            >
                              <Check className="h-4 w-4" />
                              {isSubmitting ? "Saving..." : "Approve"}
                            </Button>
                            <Button
                              onClick={() => handleReview(log.id, "rejected")}
                              disabled={isSubmitting}
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5 font-semibold text-sm px-5"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      log.feedback && (
                        <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                          <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                              Mentor Feedback
                            </p>
                            <p className="text-sm text-slate-700 italic">&quot;{log.feedback}&quot;</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
