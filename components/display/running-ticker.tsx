"use client";

import React from "react";
import { Megaphone } from "lucide-react";

interface RunningTickerProps {
  text?: string;
  speedSeconds?: number;
}

export function RunningTicker({
  text = "Selamat datang di Konstanta Education! Harap hadir 10 menit sebelum kelas dimulai. Tetap semangat menggapai cita-cita!",
  speedSeconds = 25,
}: RunningTickerProps) {
  return (
    <div className="h-12 bg-slate-950/90 border-t border-slate-800 text-white flex items-center px-4 overflow-hidden relative select-none">
      <div className="flex items-center gap-2 bg-primary px-3 py-1 rounded-md text-xs font-bold shrink-0 shadow-md z-10 mr-4">
        <Megaphone className="h-3.5 w-3.5 animate-bounce" />
        <span>INFO</span>
      </div>

      <div className="overflow-hidden w-full whitespace-nowrap relative">
        <div
          className="inline-block font-medium text-sm text-slate-200 animate-marquee"
          style={{ animationDuration: `${speedSeconds}s` }}
        >
          {text} &nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp; {text}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
}
