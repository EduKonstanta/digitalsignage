"use client";

import { DisplaySchedule, DisplayScheduleStatus } from "@/lib/display-data";
import { Clock, Sparkles, MapPin, User, Bookmark } from "lucide-react";
import { use3DTilt } from "@/lib/use-3d-tilt";

interface ScheduleBoardProps {
  schedules: DisplaySchedule[];
}

const statusConfig: Record<
  DisplayScheduleStatus,
  { label: string; className: string; priority: number }
> = {
  IN_PROGRESS: {
    label: "MULAI (LIVE)",
    className:
      "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.7)] font-black animate-pulse",
    priority: 1,
  },
  STARTING_SOON: {
    label: "SEGERA",
    className: "border-amber-300/80 bg-amber-400/20 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
    priority: 2,
  },
  DELAYED: {
    label: "TERLAMBAT",
    className: "border-amber-300/80 bg-amber-400/20 text-amber-200",
    priority: 3,
  },
  MOVED_ROOM: {
    label: "PINDAH RUANG",
    className: "border-violet-300/80 bg-violet-400/20 text-violet-200 shadow-[0_0_15px_rgba(167,139,250,0.3)]",
    priority: 3,
  },
  ONLINE: {
    label: "ONLINE",
    className: "border-blue-300/80 bg-blue-400/20 text-blue-200",
    priority: 3,
  },
  SCHEDULED: {
    label: "TERJADWAL",
    className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    priority: 4,
  },
  COMPLETED: {
    label: "SELESAI",
    className: "border-slate-600/40 bg-slate-800/60 text-slate-400 opacity-60",
    priority: 5,
  },
  CANCELLED: {
    label: "BATAL",
    className: "border-red-400/60 bg-red-500/20 text-red-300 line-through",
    priority: 6,
  },
};

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function Schedule3DItem({ schedule, index }: { schedule: DisplaySchedule; index: number }) {
  const { tiltStyle, glareStyle, handleMouseMove, handleMouseLeave } = use3DTilt({
    maxTilt: 5,
    scale: 1.01,
  });

  const config = statusConfig[schedule.computedStatus] ?? statusConfig.SCHEDULED;
  const isLive = schedule.computedStatus === "IN_PROGRESS";
  const inactive = ["COMPLETED", "CANCELLED"].includes(schedule.computedStatus);

  return (
    <article
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className={`relative my-2.5 overflow-hidden rounded-xl border p-3.5 lg:p-4 transition-all duration-300 preserve-3d ${
        isLive
          ? "border-cyan-400/90 bg-gradient-to-r from-cyan-950/80 via-slate-900/95 to-cyan-950/80 active-3d-extrude shadow-[0_15px_30px_rgba(6,182,212,0.35)]"
          : "border-white/10 bg-slate-900/70 hover:border-cyan-400/40 hover:bg-slate-800/90 shadow-md"
      } ${inactive ? "opacity-40 grayscale" : ""}`}
    >
      <div style={glareStyle} className="absolute inset-0 rounded-xl pointer-events-none" />

      {/* Background 3D Shimmer Overlay for Live items */}
      {isLive && <div className="shimmer-3d-overlay absolute inset-0 pointer-events-none" />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 preserve-3d">
        {/* Time & Class info */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div
            className={`flex flex-col items-center justify-center rounded-xl p-2.5 min-w-[110px] lg:min-w-[125px] border ${
              isLive
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                : "border-white/10 bg-black/40 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-black text-cyan-400 uppercase">
              <Clock className="h-3.5 w-3.5" /> Waktu
            </div>
            <span className="font-mono text-2xl lg:text-3xl font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {timeLabel(schedule.startAt)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              s.d. {timeLabel(schedule.endAt)}
            </span>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-950/70 px-2.5 py-0.5 text-xs font-black text-cyan-300">
                <Bookmark className="h-3.5 w-3.5 text-cyan-400" />
                {schedule.className}
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <Sparkles className="h-3 w-3" /> SESI AKTIF
                </span>
              )}
            </div>
            <h3
              className={`text-xl lg:text-2xl font-black uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] truncate ${
                schedule.computedStatus === "CANCELLED" ? "line-through" : ""
              }`}
            >
              {schedule.subject}
            </h3>
            <div className="flex items-center gap-4 text-base lg:text-xl font-bold text-slate-200 flex-wrap">
              <span className="flex items-center gap-1.5 lg:gap-2">
                <User className="h-4 w-4 lg:h-5 lg:w-5 text-cyan-400" />
                {schedule.teacher}
              </span>
            </div>
          </div>
        </div>

        {/* Room & Status */}
        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 lg:gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 lg:px-4 py-1 lg:py-1.5 text-base lg:text-xl font-black text-amber-300 shadow-md">
            <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-amber-400" />
            {schedule.room}
          </div>
          <span
            className={`rounded-full border px-3 lg:px-4 py-1 text-center text-xs lg:text-sm font-black uppercase tracking-wider shadow-lg ${config.className}`}
          >
            {config.label}
          </span>
        </div>
      </div>
    </article>
  );
}

export function SignageScheduleBoard({ schedules }: ScheduleBoardProps) {
  return (
    <section className="glass-3d-panel flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-5 relative z-10 shadow-xl">
      {/* Header Bar */}
      <div className="shrink-0 border-b border-white/10 pb-3 mb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Live 3D Academic Board
          </p>
          <h1 className="mt-0.5 text-xl lg:text-2xl font-black uppercase tracking-wider text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]">
            Jadwal Kegiatan Hari Ini
          </h1>
        </div>
        <div className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          {schedules.length} Sesi Terdaftar
        </div>
      </div>

      {/* 3D Stacked List Container */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 preserve-3d">
        {schedules.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-black uppercase tracking-widest text-slate-400">
              Belum Ada Sesi Hari Ini
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Jadwal kegiatan belajar mengajar baru akan ditampilkan secara otomatis setelah disinkronkan.
            </p>
          </div>
        ) : (
          schedules.map((schedule, index) => (
            <Schedule3DItem key={schedule.id} schedule={schedule} index={index} />
          ))
        )}
      </div>
    </section>
  );
}
