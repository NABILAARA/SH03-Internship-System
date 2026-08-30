"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getInternsOverviewChartData,
  type ChartRangePreset,
  type ChartRangeInput,
  type InternChartPoint,
} from "../services/dashboard.actions";

/* ─── Types ─────────────────────────────────────────────── */
interface RangeOption {
  preset: ChartRangePreset;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { preset: "7d",    label: "Last 7 Days"   },
  { preset: "30d",   label: "Last 30 Days"  },
  { preset: "3m",    label: "Last 3 Months" },
  { preset: "6m",    label: "Last 6 Months" },
  { preset: "1y",    label: "Last 1 Year"   },
  { preset: "all",   label: "All Time"      },
  { preset: "custom",label: "Custom Range"  },
];

const DEFAULT_PRESET: ChartRangePreset = "6m";

/* ─── Tooltip ─────────────────────────────────────────────── */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="mb-1 font-bold text-slate-700">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */
function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-2 pt-1">
      {/* fake axis + bars */}
      <div className="flex items-end gap-1 h-[138px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-slate-100"
            style={{ height: `${30 + ((i * 17) % 70)}%` }}
          />
        ))}
      </div>
      <div className="h-2 bg-slate-100 rounded w-full" />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export function InternsOverviewChart() {
  const [preset, setPreset]           = useState<ChartRangePreset>(DEFAULT_PRESET);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd]     = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustom, setShowCustom]   = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const [loading, setLoading]         = useState(true);
  const [points, setPoints]           = useState<InternChartPoint[]>([]);
  const [rangeLabel, setRangeLabel]   = useState<string>("");
  const [fetchError, setFetchError]   = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Fetch data ── */
  const fetchData = useCallback(async (input: ChartRangeInput) => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await getInternsOverviewChartData(input);
      if (result.error) {
        setFetchError(result.error);
        setPoints([]);
      } else if (result.data) {
        setPoints(result.data.points);
        setRangeLabel(result.data.rangeLabel);
      }
    } catch {
      setFetchError("Failed to load chart data.");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load — default preset */
  useEffect(() => {
    fetchData({ preset: DEFAULT_PRESET });
  }, [fetchData]);

  /* ── Handle preset selection ── */
  function handleSelectPreset(p: ChartRangePreset) {
    setDropdownOpen(false);
    if (p === "custom") {
      setShowCustom(true);
      setPreset("custom");
      return;
    }
    setShowCustom(false);
    setCustomError(null);
    setPreset(p);
    fetchData({ preset: p });
  }

  /* ── Handle custom range apply ── */
  function handleApplyCustom() {
    setCustomError(null);
    if (!customStart || !customEnd) {
      setCustomError("Please select both start and end dates.");
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      setCustomError("Start date must not be after end date.");
      return;
    }
    fetchData({ preset: "custom", customStart, customEnd });
  }

  /* ── Derived display label for the button ── */
  const selectedLabel =
    preset === "custom" && customStart && customEnd
      ? `${new Date(customStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(customEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : (RANGE_OPTIONS.find((o) => o.preset === preset)?.label ?? "Select range");

  /* ── Today's ISO string (yyyy-mm-dd) for max attr on date inputs ── */
  const todayISO = new Date().toISOString().slice(0, 10);

  const isEmpty  = !loading && !fetchError && points.length === 0;
  const hasData  = !loading && !fetchError && points.length > 0;

  return (
    <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">

      {/* ── Header ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800 shrink-0">Interns Overview</h2>

        {/* Filter dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CalendarDays className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="max-w-[120px] truncate">{selectedLabel}</span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[150px] rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.preset}
                  type="button"
                  onClick={() => handleSelectPreset(opt.preset)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-slate-50 ${
                    preset === opt.preset ? "text-blue-600 font-bold bg-blue-50/60" : "text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Custom range picker ── */}
      {showCustom && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-slate-500">Start Date</label>
            <input
              type="date"
              max={customEnd || todayISO}
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setCustomError(null);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-slate-500">End Date</label>
            <input
              type="date"
              min={customStart || undefined}
              max={todayISO}
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setCustomError(null);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            className="rounded-lg bg-blue-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-600 transition-colors"
          >
            Apply
          </button>
          {customError && (
            <p className="w-full text-[10px] font-semibold text-red-500">{customError}</p>
          )}
        </div>
      )}

      {/* ── Range label (below header on mobile, or inline) ── */}
      {!loading && rangeLabel && !showCustom && (
        <p className="mb-2 text-[10px] text-slate-400">{rangeLabel}</p>
      )}

      {/* ── Legend ── */}
      <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          On Going
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Completed
        </span>
      </div>

      {/* ── Chart area ── */}
      <div style={{ height: 155 }}>
        {loading && <ChartSkeleton />}

        {fetchError && !loading && (
          <div className="flex h-full items-center justify-center text-[11px] text-red-400">
            {fetchError}
          </div>
        )}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400">
              No intern data available for this period.
            </span>
            <span className="text-[10px] text-slate-300">
              Try selecting a wider time range.
            </span>
          </div>
        )}

        {hasData && (
          <ResponsiveContainer width="100%" height={155}>
            <AreaChart
              data={points}
              margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ioColorOnGoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="ioColorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="onGoing"
                name="On Going"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#ioColorOnGoing)"
                dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#ioColorCompleted)"
                dot={{ r: 2, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
