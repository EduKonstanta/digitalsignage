"use client";

import Image from "next/image";
import { CalendarClock, MoonStar, Trophy, Sparkles, Award } from "lucide-react";
import { use3DTilt } from "@/lib/use-3d-tilt";

interface SignageWidgetsProps {
  now: Date | null;
  prayerTimes: Record<string, string> | null;
  eventLabel?: string | null;
  eventDate?: string | null;
}

const PRAYERS = [
  { key: "Fajr", label: "Subuh" },
  { key: "Dhuhr", label: "Dzuhur" },
  { key: "Asr", label: "Ashar" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Isha", label: "Isya" },
];

function jakartaClockMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function nextPrayer(now: Date | null, timings: Record<string, string> | null) {
  if (!now || !timings) return null;
  const currentMinutes = jakartaClockMinutes(now);

  for (const prayer of PRAYERS) {
    const time = timings[prayer.key]?.slice(0, 5);
    if (!time) continue;
    const [hour, minute] = time.split(":").map(Number);
    if (hour * 60 + minute > currentMinutes) return { ...prayer, time };
  }

  const fajr = timings.Fajr?.slice(0, 5);
  return fajr ? { ...PRAYERS[0], time: fajr } : null;
}

// Nama acara & tanggal diatur admin di Sistem > Pengaturan Umum. Kalau kosong, otomatis "UTBK" 21 April.
function countdown(now: Date | null, eventLabel?: string | null, eventDateStr?: string | null) {
  if (!now) return { days: "--", event: eventLabel || "UTBK" };

  if (eventDateStr) {
    const target = new Date(`${eventDateStr}T00:00:00+07:00`);
    if (!Number.isNaN(target.getTime())) {
      return {
        days: Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000)),
        event: eventLabel || "Tanggal Penting",
      };
    }
  }

  let year = Number(
    new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric" }).format(now)
  );
  let target = new Date(`${year}-04-21T00:00:00+07:00`);
  if (target.getTime() < now.getTime()) {
    year += 1;
    target = new Date(`${year}-04-21T00:00:00+07:00`);
  }
  return {
    days: Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000)),
    event: eventLabel || `UTBK ${year}`,
  };
}

export function SignageWidgets({ now, prayerTimes, eventLabel, eventDate }: SignageWidgetsProps) {
  const prayer = nextPrayer(now, prayerTimes);
  const event = countdown(now, eventLabel, eventDate);

  const topKenzTilt = use3DTilt({ maxTilt: 6, scale: 1.01 });
  const utbkTilt = use3DTilt({ maxTilt: 6, scale: 1.01 });
  const prayerTilt = use3DTilt({ maxTilt: 6, scale: 1.01 });

  return (
    <section className="flex h-full min-h-0 flex-col gap-2.5 preserve-3d">
      {/* Top Kenz Banner Card */}
      <div
        onMouseMove={topKenzTilt.handleMouseMove}
        onMouseLeave={topKenzTilt.handleMouseLeave}
        style={topKenzTilt.tiltStyle}
        className="glass-3d-panel relative flex shrink-0 items-center overflow-hidden border-amber-400/40 bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-amber-950/40 p-3 lg:p-3.5 shadow-md preserve-3d"
      >
        <div style={topKenzTilt.glareStyle} className="absolute inset-0 rounded-2xl pointer-events-none" />
        <Trophy className="absolute -right-3 -top-3 h-24 w-24 rotate-12 text-amber-400/15 pointer-events-none" />

        <div className="relative h-12 w-12 lg:h-14 lg:w-14 shrink-0 overflow-hidden rounded-full border-2 border-amber-300/80 bg-white shadow-[0_0_20px_rgba(251,191,36,0.4)]">
          <Image
            src="/brand/konstanta-mark.jpg"
            alt="Konstanta Education"
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>

        <div className="relative ml-3 min-w-0 flex-1 preserve-3d">
          <div className="flex items-center gap-1 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
            <Award className="h-3 w-3 text-amber-400" /> Top Kenz Academy
          </div>
          <p className="truncate text-base lg:text-lg font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Konstanta Education
          </p>
          <p className="mt-0.5 truncate text-[10px] lg:text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cyan-400" /> Prestasi • Integritas • Inovasi
          </p>
        </div>
      </div>

      {/* Grid 2 Column Widgets: UTBK & Prayer */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 preserve-3d">
        {/* Countdown Tanggal Penting 3D Widget */}
        <div
          onMouseMove={utbkTilt.handleMouseMove}
          onMouseLeave={utbkTilt.handleMouseLeave}
          style={utbkTilt.tiltStyle}
          className="glass-3d-panel relative flex min-h-0 flex-col items-center justify-center border-red-500/40 bg-gradient-to-b from-red-950/60 via-slate-900/90 to-red-950/40 p-2.5 text-center shadow-md preserve-3d"
        >
          <div style={utbkTilt.glareStyle} className="absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="flex items-center gap-1.5 text-red-300 font-black text-sm lg:text-lg uppercase tracking-wider">
            <CalendarClock className="h-5 w-5 lg:h-6 lg:w-6 text-red-400 animate-pulse shrink-0" />
            <span className="truncate">{event.event}</span>
          </div>
          <p className="mt-1 font-mono text-4xl lg:text-6xl font-black leading-none text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.8)]">
            H-{event.days}
          </p>
          <span className="mt-1 text-xs lg:text-sm font-black uppercase text-slate-300 tracking-wider">
            Hari Lagi
          </span>
        </div>

        {/* Next Prayer 3D Widget */}
        <div
          onMouseMove={prayerTilt.handleMouseMove}
          onMouseLeave={prayerTilt.handleMouseLeave}
          style={prayerTilt.tiltStyle}
          className="glass-3d-panel relative flex min-h-0 flex-col items-center justify-center border-cyan-400/40 bg-gradient-to-b from-cyan-950/60 via-slate-900/90 to-cyan-950/40 p-2.5 text-center shadow-md preserve-3d"
        >
          <div style={prayerTilt.glareStyle} className="absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="flex items-center gap-1.5 text-cyan-300 font-black text-sm lg:text-lg uppercase tracking-wider">
            <MoonStar className="h-5 w-5 lg:h-6 lg:w-6 text-cyan-400 shrink-0" />
            <span className="truncate">Salat Terdekat</span>
          </div>
          <p className="mt-1 text-lg lg:text-2xl font-black uppercase text-amber-300 tracking-wider">
            {prayer?.label ?? "Menunggu"}
          </p>
          <p className="mt-0.5 font-mono text-3xl lg:text-5xl font-black leading-none text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            {prayer?.time ?? "--:--"}
          </p>
        </div>
      </div>
    </section>
  );
}
