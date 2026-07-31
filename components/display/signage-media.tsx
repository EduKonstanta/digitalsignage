"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { DisplayAnnouncement, DisplayMedia } from "@/lib/display-data";
import { resolveEmbedSrc } from "@/lib/embed";
import { ImageIcon, Sparkles } from "lucide-react";

interface SignageMediaProps {
  media: DisplayMedia[];
  announcements: DisplayAnnouncement[];
}

export function SignageMedia({ media, announcements }: SignageMediaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const playableMedia = useMemo(
    () => media.filter((item) => Boolean(item.externalUrl || item.fileUrl)),
    [media],
  );
  const safeIndex = playableMedia.length ? currentIndex % playableMedia.length : 0;
  const current = playableMedia[safeIndex];

  useEffect(() => {
    if (!current || playableMedia.length < 2) return;
    const timer = window.setTimeout(
      () => setCurrentIndex((index) => (index + 1) % playableMedia.length),
      Math.max(current.durationSeconds || 12, 6) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [current, playableMedia.length]);

  const url = current?.externalUrl || current?.fileUrl || "";
  const embedSrc = current ? resolveEmbedSrc(current.mediaType, url) : null;
  const isVideo = current?.mediaType === "VIDEO";
  const announcement = announcements[0];

  return (
    <section className="signage-panel group relative h-full overflow-hidden">
      <div className="absolute right-0 top-0 z-20 rounded-bl-xl border-b border-l border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur-md">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">
          Info & Media Zone
        </span>
      </div>

      <div className="absolute inset-0 bg-[#06090f]">
        {embedSrc && current ? (
          <iframe
            key={current.id}
            src={embedSrc}
            title={current.name}
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : isVideo && current ? (
          <video
            key={current.id}
            src={url}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={() => setCurrentIndex((index) => (index + 1) % playableMedia.length)}
          />
        ) : current ? (
          <img src={url} alt={current.name} className="h-full w-full object-cover" />
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_25%,rgba(20,184,166,.28),transparent_48%),linear-gradient(145deg,#07111a,#05070c)] px-6 text-center">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-cyan-300/10" />
            <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full border border-amber-300/10" />
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_0_40px_rgba(20,184,166,.28)]">
              <Image
                src="/brand/konstanta-mark.jpg"
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <p className="mt-5 text-[clamp(1rem,1.4vw,1.45rem)] font-black tracking-[0.12em] text-white">
              GROW · INNOVATIVE · ENGAGE
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
              Belajar terarah, bertumbuh bersama, dan raih kampus impianmu.
            </p>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-14">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
              {announcement ? <Sparkles className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
              {announcement ? "Pengumuman Utama" : "Konstanta Update"}
            </div>
            <p className="line-clamp-2 text-[clamp(.8rem,1.15vw,1.25rem)] font-black leading-tight text-white">
              {announcement?.title ?? current?.name ?? "Selamat datang di Konstanta Education"}
            </p>
            {announcement?.summary ? (
              <p className="mt-1 line-clamp-1 text-[10px] text-slate-300">{announcement.summary}</p>
            ) : null}
          </div>
          {playableMedia.length > 1 ? (
            <div className="flex shrink-0 gap-1">
              {playableMedia.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-1 rounded-full transition-all ${
                    index === safeIndex ? "w-6 bg-cyan-300" : "w-2 bg-white/25"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
