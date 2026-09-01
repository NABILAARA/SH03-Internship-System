"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { UserAvatar } from "@/components/shared/user-avatar";

interface SidebarUserMenuProps {
  name: string;
  role: string;
  initial: string;
  image?: string | null;
}

export function SidebarUserMenu({ name, role, initial, image }: Readonly<SidebarUserMenuProps>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative border-t border-slate-800 bg-slate-950/40">

      {/* Dropup menu — muncul ke atas */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden z-50">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-semibold text-red-400 hover:bg-slate-700 hover:text-red-300 transition"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      )}

      {/* Footer trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-3 hover:bg-slate-800/60 transition rounded-none"
      >
        {/* Avatar */}
        <UserAvatar
          src={image}
          name={name}
          email={initial}
          size="sm"
          className="shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate text-white">{name}</p>
          <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{role}</p>
        </div>

        {/* Chevron */}
        <ChevronUp
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-0" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
