"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DisplayAnnouncement, DisplayMedia } from "@/lib/display-data";
import { resolveEmbedSrc } from "@/lib/embed";
import { ImageIcon, Sparkles, MonitorPlay, PauseCircle, Volume2 } from "lucide-react";
import { use3DTilt } from "@/lib/use-3d-tilt";

interface SignageMediaProps {
  media: DisplayMedia[];
  announcements: DisplayAnnouncement[];
  /** Status audio global dari tombol "Aktifkan Audio" di signage-screen. */
  audioUnlocked?: boolean;
  /** Mengurangi efek GPU berat saat TV sedang memutar video/embed. */
  performanceMode?: boolean;
  onPlaybackPressureChange?: (isHeavy: boolean) => void;
}

export function SignageMedia({
  media,
  announcements,
  audioUnlocked = false,
  performanceMode = false,
  onPlaybackPressureChange,
}: SignageMediaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMediaPaused, setIsMediaPaused] = useState(false);
  const [audioEventReceived, setAudioEventReceived] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Prop adalah sumber kebenaran; event window hanya pemicu tambahan supaya
  // media tetap ikut bunyi walau komponen ini mount setelah audio di-unlock.
  const audioEnabled = audioUnlocked || audioEventReceived;

  const { tiltStyle, glareStyle, handleMouseMove, handleMouseLeave } = use3DTilt({
    maxTilt: 4,
    scale: 1.005,
  });

  const playableMedia = useMemo(
    () => media.filter((item) => Boolean(item.externalUrl || item.fileUrl)),
    [media]
  );
  const safeIndex = playableMedia.length ? currentIndex % playableMedia.length : 0;
  const current = playableMedia[safeIndex];

  // Listen to announcement start/end events to pause/resume media slideshow timer
  useEffect(() => {
    const sendYoutubeCommand = (command: "pauseVideo" | "playVideo" | "unMute") => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*",
      );
    };
    const onStart = () => {
      setIsMediaPaused(true);
      videoRef.current?.pause();
      sendYoutubeCommand("pauseVideo");
    };
    const onEnd = () => {
      setIsMediaPaused(false);
      void videoRef.current?.play().catch(() => undefined);
      sendYoutubeCommand("playVideo");
    };
    const onAudioEnabled = () => setAudioEventReceived(true);

    window.addEventListener("announcement-start", onStart);
    window.addEventListener("announcement-end", onEnd);
    window.addEventListener("signage-audio-enabled", onAudioEnabled);
    return () => {
      window.removeEventListener("announcement-start", onStart);
      window.removeEventListener("announcement-end", onEnd);
      window.removeEventListener("signage-audio-enabled", onAudioEnabled);
    };
  }, []);

  // Begitu audio aktif (dari tombol atau event), lepas mute video & iframe.
  useEffect(() => {
    if (!audioEnabled) return;

    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      void videoRef.current.play().catch(() => undefined);
    }

    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "unMute", args: [] }),
      "*",
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
      "*",
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*",
    );
  }, [audioEnabled, current?.id]);

  // Slide transition timer (paused when an announcement is active).
  // Bergantung pada id + durasi, bukan objek `current`: payload di-refresh tiap
  // 30 detik dan selalu menghasilkan objek baru, sehingga timer lama ter-reset
  // sebelum sempat berganti slide (slideshow bisa mandek di satu item).
  const currentId = current?.id;
  const currentDuration = current?.durationSeconds;
  useEffect(() => {
    if (!currentId || playableMedia.length < 2 || isMediaPaused) return;
    const timer = window.setTimeout(
      () => setCurrentIndex((index) => (index + 1) % playableMedia.length),
      Math.max(currentDuration || 12, 6) * 1000
    );
    return () => window.clearTimeout(timer);
  }, [currentId, currentDuration, playableMedia.length, isMediaPaused]);

  const url = current?.externalUrl || current?.fileUrl || "";
  const embedSrc = current
    ? resolveEmbedSrc(current.mediaType, url, { muted: !audioEnabled })
    : null;
  const isVideo = current?.mediaType === "VIDEO";
  const isHeavyPlayback = Boolean(embedSrc || isVideo);
  const announcement = announcements[0];

  useEffect(() => {
    onPlaybackPressureChange?.(isHeavyPlayback);
    return () => onPlaybackPressureChange?.(false);
  }, [isHeavyPlayback, onPlaybackPressureChange]);

  return (
    <section
      onMouseMove={performanceMode ? undefined : handleMouseMove}
      onMouseLeave={performanceMode ? undefined : handleMouseLeave}
      style={performanceMode ? undefined : tiltStyle}
      className={`group relative h-full min-h-0 overflow-hidden border-cyan-400/30 ${
        performanceMode
          ? "signage-tv-media-panel rounded-xl border bg-black shadow-none"
          : "glass-3d-panel preserve-3d shadow-xl"
      }`}
    >
      {!performanceMode && (
        <div style={glareStyle} className="absolute inset-0 rounded-2xl z-20 pointer-events-none" />
      )}

      {/* Floating 3D Badge Indicator */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-slate-950/85 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300 backdrop-blur-md shadow-md">
        {isMediaPaused ? (
          <>
            <PauseCircle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-300">Paused (Pengumuman Suara)</span>
          </>
        ) : (
          <>
            {audioEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            )}
            <span>{audioEnabled ? "Media Audio Active" : "3D Media Cinema"}</span>
          </>
        )}
      </div>

      {/* Media Player Container */}
      <div className="absolute inset-0 bg-[#06090f]">
        {embedSrc && current ? (
          <iframe
            ref={iframeRef}
            key={`${current.id}-${audioEnabled ? "audio" : "muted"}`}
            src={embedSrc}
            title={current.name}
            className="signage-media-embed h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
          />
        ) : isVideo && current ? (
          <video
            ref={videoRef}
            key={current.id}
            src={url}
            className="signage-media-video h-full w-full object-cover"
            autoPlay
            muted={!audioEnabled}
            preload="auto"
            poster={current.thumbnailUrl ?? undefined}
            playsInline
            loop={playableMedia.length < 2}
            onEnded={() => !isMediaPaused && setCurrentIndex((index) => (index + 1) % playableMedia.length)}
          />
        ) : current ? (
          <img src={url} alt={current.name} className="h-full w-full object-cover" />
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.35),transparent_60%),linear-gradient(145deg,#0b1329,#040714)] px-5 text-center preserve-3d">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-cyan-400/50 bg-white shadow-[0_0_35px_rgba(6,182,212,0.5)]">
              <Image
                src="/brand/konstanta-mark.jpg"
                alt="Konstanta Education"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <p className="mt-3 text-base font-black tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
              GROW • INNOVATIVE • ENGAGE
            </p>
            <p className="mt-1 max-w-xs text-xs font-semibold text-cyan-200/80">
              Bimbingan belajar modern dengan fasilitas digital signage terkini.
            </p>
          </div>
        )}
      </div>

      {/* Floating Announcement Overlay at Bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-4 pb-3 pt-12 preserve-3d">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
              {announcement ? (
                <Sparkles className="h-3 w-3 text-amber-400" />
              ) : (
                <ImageIcon className="h-3 w-3 text-cyan-400" />
              )}
              {announcement ? "Pengumuman Utama" : "Media Display Channel"}
            </div>
            <p className="line-clamp-2 text-sm lg:text-base font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {announcement?.title ?? current?.name ?? "Selamat Datang di Konstanta Education"}
            </p>
            {announcement?.summary && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-300 font-semibold">
                {announcement.summary}
              </p>
            )}
          </div>

          {playableMedia.length > 1 && (
            <div className="flex shrink-0 gap-1 pb-1">
              {playableMedia.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === safeIndex
                      ? "w-6 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                      : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
