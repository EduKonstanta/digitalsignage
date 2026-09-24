"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Ketiga pilihan sama-sama 16:9, jadi yang membedakan hasilnya bukan rasio
 * melainkan lebar piksel sesungguhnya: layar /display memakai breakpoint `lg:`,
 * sehingga tampilan pada 1280px berbeda dari 3840px. Iframe karena itu dirender
 * pada ukuran asli lalu diperkecil lewat transform, bukan sekadar diregangkan —
 * sebelumnya tombol-tombol ini hanya mengubah warna dirinya sendiri.
 */
const RESOLUTIONS = {
  "720p": { label: "720p (HD)", width: 1280, height: 720 },
  "1080p": { label: "1080p (FHD)", width: 1920, height: 1080 },
  "4k": { label: "4K (UHD)", width: 3840, height: 2160 },
} as const;

type ResolutionKey = keyof typeof RESOLUTIONS;

export default function PreviewPage() {
  const [resolution, setResolution] = useState<ResolutionKey>("1080p");
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  const active = RESOLUTIONS[resolution];

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const fit = () => setScale(element.clientWidth / active.width);
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active.width]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Simulasi Preview Display
          </h1>
          <p className="text-sm text-muted-foreground">
            Uji tampilan layar TV pada berbagai resolusi tanpa perlu memasang perangkatnya.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(Object.keys(RESOLUTIONS) as ResolutionKey[]).map((key) => (
            <Button
              key={key}
              variant={resolution === key ? "default" : "outline"}
              size="sm"
              onClick={() => setResolution(key)}
            >
              {RESOLUTIONS[key].label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 bg-slate-950 p-2">
        <div
          ref={frameRef}
          className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl"
        >
          <iframe
            src="/display"
            title="Display Preview Simulator"
            style={{
              width: active.width,
              height: active.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className="pointer-events-none border-0"
          />
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Preview dirender pada {active.width}&times;{active.height} piksel lalu diperkecil agar
        muat. Notifikasi presensi tidak muncul di sini karena layar ini belum dipasangkan.
      </p>
    </div>
  );
}
