import React from "react";
import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shadow-lg border border-white/20 shrink-0">
        <img
          src="/logo.png"
          alt="Konstanta Education Logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col">
        <span className="font-extrabold text-lg tracking-tight text-white leading-none">
          {APP_NAME}
        </span>
        <span className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase mt-0.5">
          {APP_TAGLINE}
        </span>
      </div>
    </div>
  );
}
