"use client";

import Image from "next/image";
import { CloudOff, Radio, ShieldCheck } from "lucide-react";
import { use3DTilt } from "@/lib/use-3d-tilt";

interface SignageHeaderProps {
  now: Date | null;
  screenName: string;
  isOnline: boolean;
  appName: string;
  branchName: string;
}

export function SignageHeader({ now, screenName, isOnline, appName, branchName }: SignageHeaderProps) {
  const { tiltStyle, glareStyle, handleMouseMove, handleMouseLeave } = use3DTilt({
    maxTilt: 4,
    scale: 1.005,
  });

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
    <header
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="glass-3d-panel relative z-20 mx-[clamp(.5rem,1vw,.85rem)] my-2 flex h-20 min-h-20 shrink-0 items-center justify-between overflow-hidden px-5 lg:px-7 shadow-xl"
    >
      <div style={glareStyle} className="absolute inset-0 rounded-2xl pointer-events-none" />

      {/* Left Brand Identity */}
      <div className="flex shrink-0 items-center gap-3.5 preserve-3d">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-cyan-400/40 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
          <Image
            src="/brand/konstanta-mark.jpg"
            alt="Konstanta Education"
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col justify-center preserve-3d">
          <div className="flex items-center gap-2">
            <p className="whitespace-nowrap text-lg sm:text-xl lg:text-2xl font-black leading-none tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {appName}
            </p>
            <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              VERIFIED
            </span>
          </div>
          <p className="mt-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.28em] text-cyan-300/90">
            {branchName}
          </p>
        </div>
      </div>

      {/* Center Laser Accent */}
      <div className="mx-6 hidden h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent xl:block relative">
        <div className="mx-auto h-1.5 w-28 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_15px_#22d3ee] blur-[1px]" />
      </div>

      {/* Right HUD: Online Badge, Date & Clock */}
      <div className="flex shrink-0 items-center gap-4 lg:gap-6 preserve-3d">
        <div
          className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md md:flex ${
            isOnline
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
              : "border-amber-400/40 bg-amber-500/15 text-amber-300"
          }`}
        >
          {isOnline ? (
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-amber-400" />
          )}
          {isOnline ? "Live 3D Synced" : "Mode Offline"}
        </div>

        <div className="hidden text-right lg:block">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {screenName}
          </p>
          <p className="mt-0.5 text-xs font-bold capitalize text-cyan-100">{date}</p>
        </div>

        <div className="h-8 w-px bg-white/15" />

        {/* 3D Clock Pill */}
        <div className="relative rounded-xl border border-cyan-400/40 bg-slate-950/80 px-4 py-1 shadow-[inset_0_0_15px_rgba(6,182,212,0.3)]">
          <p className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black leading-none text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]">
            {time}
          </p>
        </div>
      </div>
    </header>
  );
}
