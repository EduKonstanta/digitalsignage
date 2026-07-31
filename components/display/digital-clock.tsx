"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function DigitalClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const timeString = format(now, "HH:mm:ss");
  const dateString = format(now, "EEEE, d MMMM yyyy", { locale: id });

  return (
    <div className="flex flex-col items-end select-none">
      <div className="font-mono text-2xl font-bold tracking-wider text-white leading-none">
        {timeString}
      </div>
      <div className="text-[11px] font-medium text-slate-300 capitalize mt-1">
        {dateString}
      </div>
    </div>
  );
}
