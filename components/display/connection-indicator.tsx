"use client";

import React from "react";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionIndicatorProps {
  isOnline?: boolean;
}

export function ConnectionIndicator({ isOnline = true }: ConnectionIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
        isOnline
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse"
      }`}
    >
      {isOnline ? (
        <>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <Wifi className="h-3.5 w-3.5" />
          <span>ONLINE</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>OFFLINE (CACHED)</span>
        </>
      )}
    </div>
  );
}
