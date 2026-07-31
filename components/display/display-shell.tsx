"use client";

import React from "react";
import { BrandLogo } from "./brand-logo";
import { DigitalClock } from "./digital-clock";
import { ConnectionIndicator } from "./connection-indicator";
import { RunningTicker } from "./running-ticker";

interface DisplayShellProps {
  children: React.ReactNode;
  screenName?: string;
  isOnline?: boolean;
}

export function DisplayShell({
  children,
  screenName = "Display Lobby Utama",
  isOnline = true,
}: DisplayShellProps) {
  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none relative font-sans">
      {/* Header Bar */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-8 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <BrandLogo />
          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {screenName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1920x1080 • Kiosk Active</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <ConnectionIndicator isOnline={isOnline} />
          <DigitalClock />
        </div>
      </header>

      {/* Main Viewport Content Grid */}
      <main className="flex-1 p-6 overflow-hidden relative z-10 flex flex-col">
        {children}
      </main>

      {/* Footer Ticker Bar */}
      <RunningTicker />
    </div>
  );
}
