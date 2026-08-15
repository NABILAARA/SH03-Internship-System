"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";

type HistoryUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  approvalReason: string | null;
  createdAt: Date;
};

type RegistrationHistoryProps = {
  history: HistoryUser[];
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function RegistrationHistory({ history }: Readonly<RegistrationHistoryProps>) {
  const [filterStatus, setFilterStatus] = useState<"all" | "APPROVED" | "REJECTED">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = history.filter((user) => {
    const matchesStatus = filterStatus === "all" || user.approvalStatus === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      user.name?.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const approvedCount = history.filter((u) => u.approvalStatus === "APPROVED").length;
  const rejectedCount = history.filter((u) => u.approvalStatus === "REJECTED").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {approvedCount} Disetujui
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          <XCircle className="h-3.5 w-3.5" />
          {rejectedCount} Ditolak
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(["all", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                filterStatus === status
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {status === "all" ? "Semua" : status === "APPROVED" ? "Disetujui" : "Ditolak"}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-slate-500">
        Menampilkan{" "}
        <span className="font-semibold text-slate-800">{filtered.length}</span>{" "}
        dari{" "}
        <span className="font-semibold text-slate-800">{history.length}</span>{" "}
        riwayat registrasi
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Tidak ada riwayat registrasi yang sesuai.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const isApproved = user.approvalStatus === "APPROVED";
            const processedDate = isApproved ? user.approvedAt : user.rejectedAt;

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {user.name ?? "Tanpa nama"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {isApproved ? "Disetujui" : "Ditolak"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                        {user.role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">{user.email}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Daftar: {formatDate(user.createdAt)}</span>
                      <span>
                        {isApproved ? "Disetujui" : "Ditolak"}: {formatDate(processedDate)}
                      </span>
                    </div>

                    {!isApproved && user.approvalReason && (
                      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <span className="font-semibold">Alasan: </span>
                        {user.approvalReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
