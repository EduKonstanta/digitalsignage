"use client";

import Image from "next/image";
import { Cloud, CloudOff } from "lucide-react";

interface SignageHeaderProps {
  now: Date | null;
  screenName: string;
  isOnline: boolean;
}

export function SignageHeader({ now, screenName, isOnline }: SignageHeaderProps) {
  const time = now
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--:--";

  const date = now
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now)
    : "Memuat waktu";

  return (
    <header className="relative z-20 flex h-[10vh] min-h-20 items-center justify-between px-[clamp(1rem,2vw,2.5rem)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white shadow-[0_0_28px_rgba(18,181,181,0.22)]">
          <Image
            src="/brand/konstanta-mark.jpg"
            alt="Konstanta Education"
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[clamp(1.05rem,1.65vw,2rem)] font-black leading-none tracking-[0.12em] text-white">
            KONSTANTA EDUCATION
          </p>
          <p className="mt-1 truncate text-[clamp(.55rem,.65vw,.75rem)] font-semibold uppercase tracking-[0.34em] text-cyan-300/80">
            Digital Information System
          </p>
        </div>
      </div>

      <div className="mx-8 hidden h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent lg:block">
        <div className="mx-auto h-1 w-28 -translate-y-1/2 rounded-full bg-cyan-300/40 blur-sm" />
      </div>

      <div className="flex shrink-0 items-center gap-[clamp(.75rem,1.5vw,1.5rem)]">
        <div
          className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest md:flex ${
            isOnline
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/25 bg-amber-400/10 text-amber-300"
          }`}
        >
          {isOnline ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {isOnline ? "Tersinkron" : "Mode Lokal"}
        </div>
        <div className="hidden text-right xl:block">
          <p className="max-w-48 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {screenName}
          </p>
          <p className="mt-0.5 text-xs font-semibold capitalize text-slate-300">{date}</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <p className="font-mono text-[clamp(1.55rem,2.7vw,3.25rem)] font-black leading-none tracking-tight text-white [text-shadow:0_0_22px_rgba(34,211,238,.48)]">
          {time}
        </p>
      </div>
    </header>
  );
}
