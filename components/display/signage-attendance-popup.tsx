"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, Clock, CreditCard, User, X } from "lucide-react";
import type { AttendanceTapEvent } from "@/lib/attendance-events";
import { triggerGenZAnnouncement } from "@/lib/cinema-audio";
import { formatAttendanceAnnouncementText } from "@/lib/cinema-announcement";

/** Batas atas popup menunggu sapaannya selesai sebelum antrean dilanjutkan. */
const AUDIO_HOLD_CAP_MS = 14_000;

interface SignageAttendancePopupProps {
  event: AttendanceTapEvent | null;
  onClose: () => void;
  autoCloseDurationMs?: number;
  /** Gate audio yang sama dengan pengumuman terjadwal (tombol "Aktifkan Audio"). */
  audioEnabled?: boolean;
}

export function SignageAttendancePopup({
  event,
  onClose,
  autoCloseDurationMs = 7000,
  audioEnabled = false,
}: SignageAttendancePopupProps) {
  const [progress, setProgress] = useState(100);
  const audioPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!event) return;

    setProgress(100);
    const startTime = Date.now();
    let cancelled = false;
    let speechTimer: number | undefined;

    /**
     * Batas kapan popup ditutup. Tanpa audio cukup autoCloseDurationMs. Dengan
     * audio, popup ditahan sampai sapaannya selesai supaya nama yang terdengar
     * cocok dengan wajah yang tampil — sapaan penuh butuh ~9 detik, lebih lama
     * dari 7 detik bawaan. AUDIO_HOLD_CAP_MS menjaga antrean tetap jalan kalau
     * ucapan tertahan di belakang pengumuman lain.
     */
    let holdUntil = startTime + autoCloseDurationMs;

    if (audioEnabled && audioPlayedRef.current !== event.id && (event.tapStatus ?? "RECORDED") === "RECORDED") {
      audioPlayedRef.current = event.id;
      holdUntil = startTime + AUDIO_HOLD_CAP_MS;

      const text = formatAttendanceAnnouncementText({
        studentName: event.studentName,
        type: event.type,
        seed: event.id,
      });
      speechTimer = window.setTimeout(() => {
        void triggerGenZAnnouncement(
          text,
          // Suara pria/wanita mengikuti Student.voiceGender; nada diatur di cinema-audio.
          { gender: event.voiceGender, rate: 1.05 },
          // Siswa yang baru hadir didahulukan di antrean audio.
          "attendance",
        ).then(() => {
          if (cancelled) return;
          holdUntil = Math.min(holdUntil, Date.now() + 600);
        });
      }, 300);
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const total = Math.max(1, holdUntil - startTime);
      setProgress(Math.max(0, 100 - (elapsed / total) * 100));

      if (Date.now() >= holdUntil) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (speechTimer !== undefined) window.clearTimeout(speechTimer);
    };
  }, [event, autoCloseDurationMs, onClose, audioEnabled]);

  if (!event) return null;

  const tapStatus = event.tapStatus ?? "RECORDED";
  const isCheckOut = event.type === "CHECK_OUT";
  const isDuplicate = tapStatus === "DUPLICATE";
  const isUnknown = tapStatus === "UNKNOWN_CARD";
  const accent = isUnknown ? "rose" : isCheckOut || isDuplicate ? "amber" : "cyan";
  const borderClass =
    accent === "rose"
      ? "border-rose-400/80 shadow-[0_0_50px_rgba(251,113,133,0.5)]"
      : accent === "amber"
        ? "border-amber-400/80 shadow-[0_0_50px_rgba(251,191,36,0.5)]"
        : "border-cyan-400/80 shadow-[0_0_50px_rgba(6,182,212,0.6)]";
  const barClass =
    accent === "rose" ? "bg-rose-400" : accent === "amber" ? "bg-amber-400" : "bg-cyan-400";
  const badgeClass =
    accent === "rose"
      ? "bg-rose-400/20 text-rose-300 border border-rose-400/30"
      : accent === "amber"
        ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
        : "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30";
  const iconClass =
    accent === "rose" ? "text-rose-400" : accent === "amber" ? "text-amber-400" : "text-cyan-400";
  const successMessage =
    event.message ||
    (isUnknown
      ? "UID kartu tidak ditemukan pada data siswa aktif."
      : isDuplicate
        ? "Kartu baru saja di-tap beberapa detik yang lalu."
        : isCheckOut
          ? "Tap keluar berhasil tercatat."
          : "Telah hadir di Konstanta Education. Semangat belajar!");

  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-auto animate-in fade-in slide-in-from-top-6 duration-500">
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 bg-slate-950/95 backdrop-blur-2xl transition-all duration-300 ${borderClass}`}
      >
        {/* Top Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800/80">
          <div
            className={`h-full transition-all duration-75 ease-linear ${barClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative p-5 sm:p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-5">
            {/* Student Avatar / Photo */}
            <div className="relative shrink-0">
              <div
                className={`flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border-2 overflow-hidden bg-slate-900 shadow-xl ${
                  isCheckOut ? "border-amber-400" : "border-cyan-400"
                }`}
              >
                {event.photoUrl ? (
                  <img
                    src={event.photoUrl}
                    alt={event.studentName}
                    className="h-full w-full object-cover"
                  />
                ) : isUnknown ? (
                  <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 text-rose-400" />
                ) : (
                  <User className={`h-10 w-10 sm:h-12 sm:w-12 ${iconClass}`} />
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 ${
                  accent === "rose"
                    ? "bg-rose-400 text-slate-950"
                    : accent === "amber"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-cyan-400 text-slate-950"
                }`}
              >
                {isUnknown ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            {/* Main Greeting & Student Details */}
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${badgeClass}`}
                >
                  {isUnknown ? <AlertTriangle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {isUnknown ? "KARTU TIDAK TERDAFTAR" : isDuplicate ? "TAP GANDA TERDETEKSI" : isCheckOut ? "SISWA TAP KELUAR" : "TELAH HADIR"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  {event.timeFormatted} WIB
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {event.studentName}
              </h2>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300">
                {event.cardUid ? (
                  <span className={`flex items-center gap-1.5 font-mono ${isUnknown ? "text-rose-300" : "text-cyan-300"}`}>
                    <CreditCard className="h-4 w-4" /> RFID {event.cardUid}
                  </span>
                ) : null}
                <span
                  className={`text-sm font-semibold ${
                    isUnknown ? "text-rose-200" : isDuplicate ? "text-amber-200" : "text-emerald-300"
                  }`}
                >
                  {successMessage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
