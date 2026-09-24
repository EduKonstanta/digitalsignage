"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle2, Sparkles, MessageSquare, Clock, User, X, ShieldCheck } from "lucide-react";
import type { AttendanceTapEvent } from "@/lib/attendance-events";
import { triggerGenZAnnouncement } from "@/lib/cinema-audio";

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

    if (audioEnabled && audioPlayedRef.current !== event.id) {
      audioPlayedRef.current = event.id;
      holdUntil = startTime + AUDIO_HOLD_CAP_MS;

      const text =
        event.type === "CHECK_OUT"
          ? `Nice work, ${event.studentName}! Sesi belajar kamu hari ini officially done. Hati-hati di jalan, and see you next time!`
          : `Hi, ${event.studentName}! Welcome back di Konstanta Education. Kehadiran kamu udah ke-record, nih. Semangat belajar, and have a productive session!`;
      speechTimer = window.setTimeout(() => {
        void triggerGenZAnnouncement(
          text,
          {
            gender: event.voiceGender,
            rate: 1.03,
            pitch: event.voiceGender === "FEMALE" ? 1.08 : event.voiceGender === "MALE" ? 0.94 : 1,
          },
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

  const isCheckOut = event.type === "CHECK_OUT";

  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-auto animate-in fade-in slide-in-from-top-6 duration-500">
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 shadow-[0_0_50px_rgba(6,182,212,0.5)] backdrop-blur-2xl transition-all duration-300 ${
          isCheckOut
            ? "border-amber-400/80 bg-slate-950/95 shadow-[0_0_50px_rgba(251,191,36,0.5)]"
            : "border-cyan-400/80 bg-slate-950/95 shadow-[0_0_50px_rgba(6,182,212,0.6)]"
        }`}
      >
        {/* Top Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800/80">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isCheckOut ? "bg-amber-400" : "bg-cyan-400"
            }`}
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
                ) : (
                  <User
                    className={`h-10 w-10 sm:h-12 sm:w-12 ${
                      isCheckOut ? "text-amber-400" : "text-cyan-400"
                    }`}
                  />
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 ${
                  isCheckOut ? "bg-amber-400 text-slate-950" : "bg-cyan-400 text-slate-950"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            {/* Main Greeting & Student Details */}
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                    isCheckOut
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {isCheckOut ? "TAP PULANG / CHECK-OUT" : "TAP PRESENSI / CHECK-IN"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  {event.timeFormatted} WIB
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {event.studentName}
              </h2>

              <div className="mt-1 flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  NIS: {event.nis}
                </span>
                <span className="font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Kelas: {event.className}
                </span>
              </div>

              {/* Fonnte WhatsApp Status Banner */}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {["SENT", "DELIVERED", "READ"].includes(event.fonnteStatus) ? (
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Notifikasi WhatsApp terkirim ke Orang Tua ({event.parentPhone || "Terverifikasi"})
                    </span>
                  ) : event.fonnteStatus === "QUEUED" ? (
                    <span className="text-cyan-300 font-medium">
                      Notifikasi WhatsApp sedang diproses untuk Orang Tua
                    </span>
                  ) : event.fonnteStatus === "DISABLED" ? (
                    <span className="text-slate-400">
                      Presensi tercatat di sistem (Notifikasi WhatsApp tidak diaktifkan)
                    </span>
                  ) : event.fonnteStatus === "SKIPPED" ? (
                    <span className="text-slate-400">
                      Presensi tercatat di sistem (Nomor WA orang tua belum diatur)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">
                      Presensi tercatat (Gagal mengirim WA ke orang tua)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
