"use client";

import { useState } from "react";
import { Search, UserCheck, UserX, Loader2 } from "lucide-react";
import { assignMentorToIntern, unassignMentorFromIntern } from "../services/user-management.actions";
import { Button } from "@/components/ui/button";

type Intern = {
  id: string;
  name: string | null;
  email: string;
  internRelation: { mentor: { id: string; name: string | null; email: string } } | null;
};

type Mentor = { id: string; name: string | null; email: string };

type MentorAssignmentProps = {
  interns: Intern[];
  mentors: Mentor[];
};

export function MentorAssignment({ interns, mentors }: Readonly<MentorAssignmentProps>) {
  const [localInterns, setLocalInterns] = useState<Intern[]>(interns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredInterns = localInterns.filter((intern) => {
    const q = searchQuery.toLowerCase();
    return (
      intern.name?.toLowerCase().includes(q) ||
      intern.email.toLowerCase().includes(q)
    );
  });

  const handleAssign = async (internId: string) => {
    const mentorId = selectedMentor[internId];
    if (!mentorId) return;

    setLoadingId(internId);
    try {
      const res = await assignMentorToIntern(internId, mentorId);
      if (res.error) {
        alert(res.error);
      } else {
        const mentor = mentors.find((m) => m.id === mentorId);
        setLocalInterns((prev) =>
          prev.map((intern) =>
            intern.id === internId
              ? {
                  ...intern,
                  internRelation: mentor
                    ? { mentor: { id: mentor.id, name: mentor.name, email: mentor.email } }
                    : intern.internRelation
                }
              : intern
          )
        );
        setSelectedMentor((prev) => {
          const next = { ...prev };
          delete next[internId];
          return next;
        });
      }
    } catch {
      alert("Gagal menugaskan mentor.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnassign = async (internId: string) => {
    setLoadingId(internId);
    try {
      const res = await unassignMentorFromIntern(internId);
      if (res.error) {
        alert(res.error);
      } else {
        setLocalInterns((prev) =>
          prev.map((intern) =>
            intern.id === internId ? { ...intern, internRelation: null } : intern
          )
        );
      }
    } catch {
      alert("Gagal menghapus penugasan mentor.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari intern berdasarkan nama atau email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>

      {filteredInterns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          {localInterns.length === 0
            ? "Belum ada intern dengan status APPROVED."
            : "Tidak ada intern yang cocok dengan pencarian."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterns.map((intern) => {
            const isLoading = loadingId === intern.id;
            const currentMentor = intern.internRelation?.mentor;
            const chosenMentorId = selectedMentor[intern.id] ?? "";

            return (
              <div
                key={intern.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* Intern info */}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">
                      {intern.name ?? "Tanpa nama"}
                    </p>
                    <p className="text-xs text-slate-500">{intern.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {currentMentor ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-700 font-medium">
                            Mentor: {currentMentor.name ?? currentMentor.email}
                          </span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-400">Belum ditugaskan</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Assignment controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={chosenMentorId}
                      onChange={(e) =>
                        setSelectedMentor((prev) => ({
                          ...prev,
                          [intern.id]: e.target.value
                        }))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                      disabled={isLoading}
                    >
                      <option value="">-- Pilih Mentor --</option>
                      {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                          {mentor.name ?? mentor.email}
                        </option>
                      ))}
                    </select>

                    <Button
                      onClick={() => handleAssign(intern.id)}
                      disabled={!chosenMentorId || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 h-auto"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Assign"
                      )}
                    </Button>

                    {currentMentor && (
                      <Button
                        onClick={() => handleUnassign(intern.id)}
                        disabled={isLoading}
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold px-3 py-1.5 h-auto"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Hapus Penugasan"
                        )}
                      </Button>
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
