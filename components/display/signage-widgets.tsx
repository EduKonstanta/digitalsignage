"use client";

import Image from "next/image";
import { CalendarClock, MoonStar, Trophy } from "lucide-react";

interface SignageWidgetsProps {
  now: Date | null;
  prayerTimes: Record<string, string> | null;
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

function countdown(now: Date | null) {
  if (!now) return { days: "--", event: "UTBK" };
  let year = Number(
    new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric" }).format(now),
  );
  let target = new Date(`${year}-04-21T00:00:00+07:00`);
  if (target.getTime() < now.getTime()) {
    year += 1;
    target = new Date(`${year}-04-21T00:00:00+07:00`);
  }
  return {
    days: Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000)),
    event: `UTBK ${year}`,
  };
}

export function SignageWidgets({ now, prayerTimes }: SignageWidgetsProps) {
  const prayer = nextPrayer(now, prayerTimes);
  const event = countdown(now);

  return (
    <section className="grid h-full min-h-0 grid-rows-[minmax(0,1.15fr)_minmax(0,.85fr)] gap-3">
      <div className="signage-panel relative flex min-h-0 items-center overflow-hidden border-amber-300/20 bg-[linear-gradient(120deg,rgba(0,0,0,.65),rgba(212,175,55,.11))] p-[clamp(.65rem,1vw,1rem)]">
        <Trophy className="absolute -right-5 -top-5 h-28 w-28 rotate-12 text-amber-300/10" />
        <div className="relative h-[clamp(3.5rem,5.2vw,6rem)] w-[clamp(3.5rem,5.2vw,6rem)] shrink-0 overflow-hidden rounded-full border-2 border-amber-200/70 bg-white shadow-[0_0_24px_rgba(251,191,36,.2)]">
          <Image
            src="/brand/konstanta-mark.jpg"
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div className="relative ml-3 min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-300">
            Top Kenz
          </p>
          <p className="mt-1 truncate text-[clamp(.9rem,1.25vw,1.35rem)] font-black leading-none text-white">
            Konstanta Education
          </p>
          <div className="my-2 h-px w-12 bg-cyan-300/60" />
          <p className="truncate text-[clamp(.62rem,.8vw,.82rem)] font-bold uppercase tracking-wide text-cyan-300">
            Prestasi · Integritas · Inovasi
          </p>
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-2 gap-3">
        <div className="signage-panel flex min-h-0 flex-col items-center justify-center border-red-400/20 bg-[linear-gradient(180deg,rgba(127,29,29,.25),rgba(0,0,0,.45))] p-2 text-center">
          <div className="flex items-center gap-1 text-red-300/80">
            <CalendarClock className="h-3 w-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.16em]">{event.event}</span>
          </div>
          <p className="mt-1 text-[clamp(1.5rem,2.7vw,3rem)] font-black leading-none text-red-400 [text-shadow:0_0_14px_rgba(248,113,113,.25)]">
            H-{event.days}
          </p>
        </div>

        <div className="signage-panel flex min-h-0 flex-col items-center justify-center border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,145,178,.18),rgba(0,0,0,.45))] p-2 text-center">
          <div className="flex items-center gap-1 text-cyan-300/80">
            <MoonStar className="h-3 w-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.14em]">Salat Terdekat</span>
          </div>
          <p className="mt-1 text-[clamp(.7rem,.9vw,.95rem)] font-bold text-slate-300">
            {prayer?.label ?? "Menunggu data"}
          </p>
          <p className="font-mono text-[clamp(1.15rem,1.8vw,2rem)] font-black leading-none text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,.25)]">
            {prayer?.time ?? "--:--"}
          </p>
        </div>
      </div>
    </section>
  );
}
