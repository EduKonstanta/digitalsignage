"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, Layers, Box, Flame, Volume2, VolumeX } from "lucide-react";
import {
  DisplayPayload,
  DisplaySchedule,
  DisplayScheduleStatus,
} from "@/lib/display-data";
import { SignageHeader } from "./signage-header";
import { SignageMedia } from "./signage-media";
import { SignageScheduleBoard } from "./signage-schedule-board";
import { SignageTicker } from "./signage-ticker";
import { SignageWidgets } from "./signage-widgets";
import { SignageAttendancePopup } from "./signage-attendance-popup";
import { Canvas3DBackdrop } from "@/components/ui/canvas-3d-backdrop";
import { formatPreClassAnnouncementText } from "@/lib/cinema-announcement";
import {
  pauseAllMedia,
  resumeAllMedia,
  triggerGenZAnnouncement,
  unlockSignageAudio,
} from "@/lib/cinema-audio";
import type { AttendanceTapEvent } from "@/lib/attendance-events";
import { SCREEN_QUERY_PARAM } from "@/lib/constants";

const EMPTY_PAYLOAD: DisplayPayload = {
  screen: {
    name: "TV Display Lobby Utama",
    deviceId: "TV-LOBBY-01",
    resolution: "1920x1080",
  },
  schedules: [],
  announcements: [],
  media: [],
  tickers: [],
  voices: [],
  emergency: null,
  widgets: {
    appName: "KONSTANTA EDUCATION",
    branchName: "Digital Information System",
    eventLabel: null,
    eventDate: null,
    prayerCity: "Jakarta",
  },
  generatedAt: "",
};

const FALLBACK_SESSIONS = [
  ["08:00", "10:00", "12 ELC 1", "Fisika", "Kang Guru Budi", "Growie"],
  ["10:15", "12:00", "11 ELC 2", "Bahasa Inggris", "Kang Guru Anita", "Thinkie"],
  ["13:00", "15:00", "12 ELC 2", "Ekonomi", "Kang Guru Sarah", "Ideon"],
  ["15:30", "17:00", "10 ELC", "Penalaran Matematika", "Kang Guru Fikri", "Sigma"],
  ["17:15", "18:45", "12 ELC K", "Kimia", "Kang Guru Kusuma", "Inno"],
  ["19:00", "20:30", "12 ELC G", "Literasi Bahasa Indonesia", "Kang Guru Tono", "FO"],
] as const;

function jakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function fallbackSchedules(now: Date): DisplaySchedule[] {
  const dateKey = jakartaDateKey(now);
  return FALLBACK_SESSIONS.map(([start, end, className, subject, teacher, room], index) => ({
    id: `fallback-${index}`,
    startAt: `${dateKey}T${start}:00+07:00`,
    endAt: `${dateKey}T${end}:00+07:00`,
    className,
    subject,
    teacher,
    room,
    computedStatus: "SCHEDULED" as DisplayScheduleStatus,
  }));
}

function liveStatus(schedule: DisplaySchedule, now: Date): DisplayScheduleStatus {
  if (["CANCELLED", "DELAYED", "MOVED_ROOM", "ONLINE"].includes(schedule.computedStatus)) {
    return schedule.computedStatus;
  }
  const start = new Date(schedule.startAt).getTime();
  const end = new Date(schedule.endAt).getTime();
  const current = now.getTime();
  if (current > end) return "COMPLETED";
  if (current >= start) return "IN_PROGRESS";
  if (start - current <= 15 * 60 * 1000) return "STARTING_SOON";
  return "SCHEDULED";
}

const statusPriority: Record<DisplayScheduleStatus, number> = {
  IN_PROGRESS: 1,
  STARTING_SOON: 2,
  DELAYED: 3,
  MOVED_ROOM: 3,
  ONLINE: 3,
  SCHEDULED: 4,
  COMPLETED: 5,
  CANCELLED: 6,
};

/**
 * Kiosk berjalan berminggu-minggu tanpa reload, jadi Set penanda "sudah
 * diputar/sudah dilihat" harus dibatasi. Tanpa ini isinya tumbuh terus
 * (tiap tap presensi, tiap sesi, tiap pengumuman) sepanjang umur halaman.
 */
const SEEN_ID_LIMIT = 500;
/** Popup presensi tampil ~7 detik, jadi antrean panjang jadi basi dengan cepat. */
const ATTENDANCE_QUEUE_LIMIT = 8;
/** Polling cepat saat SSE belum pernah mengantar tap, lambat sebagai jaring pengaman. */
const ATTENDANCE_POLL_FAST_MS = 2_000;
const ATTENDANCE_POLL_SLOW_MS = 15_000;

function rememberId(set: Set<string>, id: string) {
  set.add(id);
  if (set.size > SEEN_ID_LIMIT) {
    const excess = set.size - SEEN_ID_LIMIT;
    let removed = 0;
    for (const value of set) {
      set.delete(value);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

export function SignageScreen() {
  const [payload, setPayload] = useState<DisplayPayload>(EMPTY_PAYLOAD);
  const [now, setNow] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const [isIsometricStage, setIsIsometricStage] = useState(false);
  // Video/embed sedang tampil: efek GPU berat dimatikan supaya TV berspek rendah tidak patah-patah.
  const [heavyPlayback, setHeavyPlayback] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioStarting, setAudioStarting] = useState(false);
  const [sseDelivered, setSseDelivered] = useState(false);
  const [latestTapEvent, setLatestTapEvent] = useState<AttendanceTapEvent | null>(null);
  const playedVoiceIds = useRef(new Set<string>());
  const spokenStartingSoonIds = useRef(new Set<string>());
  const seenAttendanceIds = useRef(new Set<string>());
  const lastAttendanceTimestamp = useRef(new Date().toISOString());
  // Tap yang datang saat popup lain masih tampil; ditampilkan bergiliran.
  const attendanceQueue = useRef<AttendanceTapEvent[]>([]);
  const attendanceShowing = useRef(false);

  const refresh = useCallback(async () => {
    try {
      // /display?screen=<deviceId> menentukan playlist & cabang layar ini.
      const deviceId = new URLSearchParams(window.location.search).get(SCREEN_QUERY_PARAM);
      const query = deviceId ? `?${SCREEN_QUERY_PARAM}=${encodeURIComponent(deviceId)}` : "";
      const response = await fetch(`/api/v1/display${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Display API returned ${response.status}`);
      const body = (await response.json()) as { success: boolean; data: DisplayPayload };
      if (!body.success) throw new Error("Display API returned an error");
      setPayload(body.data);
      setIsOnline(true);
      setHasSynced(true);
    } catch (error) {
      console.error("Display sync failed", error);
      setIsOnline(false);
    }
  }, []);

  /** Tampilkan tap berikutnya bila tidak ada popup yang sedang tampil. */
  const pumpAttendanceQueue = useCallback(() => {
    if (attendanceShowing.current) return;
    const next = attendanceQueue.current.shift();
    if (!next) return;
    attendanceShowing.current = true;
    setLatestTapEvent(next);
  }, []);

  const showAttendanceEvent = useCallback(
    (event: AttendanceTapEvent) => {
      if (seenAttendanceIds.current.has(event.id)) return;
      rememberId(seenAttendanceIds.current, event.id);
      // SSE dan polling bisa mendahului satu sama lain, jadi kursor hanya maju.
      if (event.timestamp > lastAttendanceTimestamp.current) {
        lastAttendanceTimestamp.current = event.timestamp;
      }
      attendanceQueue.current.push(event);
      // Batasi antrean supaya lonjakan tap tidak menampilkan sapaan basi
      // bermenit-menit setelah siswanya lewat; yang paling lama dibuang.
      if (attendanceQueue.current.length > ATTENDANCE_QUEUE_LIMIT) {
        attendanceQueue.current.splice(
          0,
          attendanceQueue.current.length - ATTENDANCE_QUEUE_LIMIT,
        );
      }
      pumpAttendanceQueue();
    },
    [pumpAttendanceQueue],
  );

  const closeAttendancePopup = useCallback(() => {
    attendanceShowing.current = false;
    setLatestTapEvent(null);
    // Jeda pendek supaya animasi keluar selesai sebelum popup berikutnya masuk.
    window.setTimeout(pumpAttendanceQueue, 400);
  }, [pumpAttendanceQueue]);

  const enableAudio = useCallback(async () => {
    setAudioStarting(true);
    try {
      const enabled = await unlockSignageAudio();
      setAudioEnabled(enabled);
      if (enabled) {
        await triggerGenZAnnouncement("Audio digital signage aktif. Voice announcement siap digunakan.", {
          gender: "FEMALE",
          rate: 1.02,
        });
      }
    } finally {
      setAudioStarting(false);
    }
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/events/stream");
    const handleAttendanceTap = (message: MessageEvent<string>) => {
      try {
        showAttendanceEvent(JSON.parse(message.data) as AttendanceTapEvent);
        // Baru setelah ada tap sungguhan kita percaya SSE sebagai kanal utama.
        setSseDelivered(true);
      } catch (error) {
        console.error("Invalid attendance event", error);
      }
    };
    const handleError = () => setSseDelivered(false);

    eventSource.addEventListener("attendance_tap", handleAttendanceTap as EventListener);
    eventSource.addEventListener("error", handleError);
    return () => {
      eventSource.removeEventListener("attendance_tap", handleAttendanceTap as EventListener);
      eventSource.removeEventListener("error", handleError);
      eventSource.close();
      setSseDelivered(false);
    };
  }, [showAttendanceEvent]);

  /**
   * Polling tidak pernah dimatikan total. `attendanceEmitter` hidup di memori
   * satu proses, sehingga di lingkungan serverless (Vercel) POST /attendance/tap
   * dan stream SSE berada di instance berbeda dan event tidak pernah sampai —
   * padahal stream tetap membalas "connected". Menggantungkan polling pada
   * status tersambung membuat layar diam tanpa gejala. Jadi: polling cepat
   * sampai SSE terbukti mengantar tap, lalu melambat jadi jaring pengaman.
   */
  useEffect(() => {
    const pollLatestAttendance = async () => {
      try {
        const response = await fetch(
          `/api/v1/attendance/latest?after=${encodeURIComponent(lastAttendanceTimestamp.current)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          success: boolean;
          data: AttendanceTapEvent[] | AttendanceTapEvent | null;
        };
        if (!body.success || !body.data) return;
        const events = Array.isArray(body.data) ? body.data : [body.data];
        events.forEach(showAttendanceEvent);
      } catch {
        // Jaringan putus sesaat; percobaan berikutnya menyusul otomatis.
      }
    };

    const timer = window.setInterval(
      pollLatestAttendance,
      sseDelivered ? ATTENDANCE_POLL_SLOW_MS : ATTENDANCE_POLL_FAST_MS,
    );
    return () => window.clearInterval(timer);
  }, [showAttendanceEvent, sseDelivered]);

  useEffect(() => {
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  // Kunci stabil: hanya berubah bila daftar pengumuman suara benar-benar berubah.
  const pendingVoiceKey = payload.voices.map((voice) => voice.id).join("|");

  useEffect(() => {
    if (!audioEnabled) return;
    const pending = payload.voices.filter((voice) => !playedVoiceIds.current.has(voice.id));
    if (!pending.length) return;
    let cancelled = false;

    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
    const playAudioUrl = (url: string, volume: number) =>
      new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });

    const playPending = async () => {
      for (const voice of pending) {
        if (cancelled) return;
        rememberId(playedVoiceIds.current, voice.id);

        if (voice.openingAudioUrl) {
          pauseAllMedia();
          try {
            await playAudioUrl(voice.openingAudioUrl, voice.volume / 100);
          } finally {
            resumeAllMedia();
          }
        }

        for (let count = 0; count < voice.repetitions && !cancelled; count += 1) {
          if (voice.audioUrl) {
            pauseAllMedia();
            try {
              await playAudioUrl(voice.audioUrl, voice.volume / 100);
            } finally {
              resumeAllMedia();
            }
          } else {
            await triggerGenZAnnouncement(voice.text, {
              language: voice.language,
              preferredVoiceName: voice.voiceName,
              volume: voice.volume / 100,
              chime: count === 0 && !voice.openingAudioUrl,
            });
          }

          if (count + 1 < voice.repetitions && voice.intervalSeconds > 0) {
            await wait(voice.intervalSeconds * 1000);
          }
        }
      }
    };

    void playPending();
    return () => {
      cancelled = true;
    };
    // Sengaja bergantung pada daftar id, bukan objek payload.voices: refresh
    // 30 detik selalu menghasilkan array baru, sehingga efek ini ter-cleanup
    // (cancelled = true) di tengah pengulangan dan pengumuman hanya terputar
    // sekali walau diatur beberapa kali ulang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled, pendingVoiceKey]);

  useEffect(() => {
    void refresh();
    const sync = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(sync);
  }, [refresh]);

  const prayerCity = payload.widgets.prayerCity || "Jakarta";

  useEffect(() => {
    const loadPrayerTimes = async () => {
      try {
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(prayerCity)}&country=Indonesia&method=11`
        );
        if (!response.ok) return;
        const body = (await response.json()) as { data?: { timings?: Record<string, string> } };
        setPrayerTimes(body.data?.timings ?? null);
      } catch {
        setPrayerTimes(null);
      }
    };
    void loadPrayerTimes();
    const timer = window.setInterval(loadPrayerTimes, 12 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [prayerCity]);

  const schedules = useMemo(() => {
    if (!now) return payload.schedules;
    const source = hasSynced ? payload.schedules : fallbackSchedules(now);
    return source
      .map((schedule) => ({
        ...schedule,
        computedStatus: liveStatus(schedule, now),
      }))
      .sort((a, b) => {
        const priority = statusPriority[a.computedStatus] - statusPriority[b.computedStatus];
        return priority || new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      });
  }, [hasSynced, now, payload.schedules]);

  // Find first session starting soon (10-15 minutes left)
  const startingSoonSession = useMemo(() => {
    return schedules.find((s) => s.computedStatus === "STARTING_SOON");
  }, [schedules]);

  // Auto Gen-Z Announcement for Starting Soon Session
  useEffect(() => {
    if (!startingSoonSession || spokenStartingSoonIds.current.has(startingSoonSession.id)) return;

    rememberId(spokenStartingSoonIds.current, startingSoonSession.id);
    const announcementText = formatPreClassAnnouncementText({
      className: startingSoonSession.className,
      subject: startingSoonSession.subject,
      teacher: startingSoonSession.teacher,
      room: startingSoonSession.room,
    });

    void triggerGenZAnnouncement(announcementText);
  }, [startingSoonSession]);

  if (payload.emergency) {
    const critical = payload.emergency.severity === "CRITICAL";
    return (
      <main
        className={`flex h-screen w-screen flex-col items-center justify-center overflow-hidden px-8 text-center text-white ${
          critical ? "bg-red-700" : "bg-amber-600"
        }`}
      >
        <div className="signage-emergency-pulse absolute inset-0 bg-black/15" />
        <div className="relative z-10 flex max-w-5xl flex-col items-center">
          {critical ? (
            <ShieldAlert className="mb-7 h-28 w-28" strokeWidth={1.5} />
          ) : (
            <AlertTriangle className="mb-7 h-28 w-28" strokeWidth={1.5} />
          )}
          <p className="text-sm font-black uppercase tracking-[0.5em]">Emergency Broadcast</p>
          <h1 className="mt-4 text-[clamp(3rem,7vw,8rem)] font-black uppercase leading-none tracking-tight">
            {payload.emergency.title}
          </h1>
          <p className="mt-7 max-w-4xl text-[clamp(1.25rem,2.5vw,3rem)] font-bold leading-snug">
            {payload.emergency.instruction}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`relative flex h-screen w-screen select-none flex-col overflow-hidden bg-[#030712] text-white perspective-1000 ${
        heavyPlayback ? "signage-tv-performance" : ""
      }`}
    >
      <SignageAttendancePopup
        event={latestTapEvent}
        onClose={closeAttendancePopup}
        audioEnabled={audioEnabled}
      />

      <button
        type="button"
        onClick={() => void enableAudio()}
        disabled={audioStarting}
        className={`fixed bottom-2 left-4 z-[60] flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-all hover:scale-105 disabled:opacity-60 ${
          audioEnabled
            ? "border-emerald-400/60 bg-emerald-950/90 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,.35)]"
            : "border-amber-400/70 bg-slate-950/95 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,.4)] animate-pulse"
        }`}
        title={audioEnabled ? "Uji ulang audio signage" : "Klik sekali untuk mengaktifkan audio browser"}
      >
        {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        {audioStarting ? "Menyiapkan Audio..." : audioEnabled ? "Audio Aktif" : "Aktifkan Audio"}
      </button>

      {/* Interactive 3D Spatial Canvas Background (dilepas saat video agar loop render-nya berhenti) */}
      {!heavyPlayback && <Canvas3DBackdrop />}

      {/* Modern Gen-Z 10-Minute Pre-Class Alert Banner */}
      {startingSoonSession && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-cyan-400 bg-slate-950/95 px-6 py-2.5 shadow-[0_0_40px_rgba(6,182,212,0.6)] backdrop-blur-xl animate-bounce">
          <Flame className="h-6 w-6 text-amber-400 shrink-0" />
          <div className="text-left max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-300">
                🔥 READY FOR CLASS? (10 MENIT LAGI)
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-cyan-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase">
                <Volume2 className="h-3 w-3" /> AUDIO ANNOUNCEMENT
              </span>
            </div>
            <p className="text-xs lg:text-sm font-bold text-white leading-tight mt-0.5">
              Kelas <strong className="text-cyan-300">{startingSoonSession.subject}</strong> ({startingSoonSession.className}) bareng{" "}
              <strong className="text-amber-300">{startingSoonSession.teacher}</strong> di {startingSoonSession.room} segera dimulai. Yuk siapin diri & bakar semangatmu!
            </p>
          </div>
        </div>
      )}

      {/* Floating 3D Mode Toggle Controller */}
      <button
        onClick={() => setIsIsometricStage(!isIsometricStage)}
        className="fixed bottom-1.5 right-4 z-50 flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-slate-950/95 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Toggle 3D Isometric Kiosk Stage View"
      >
        {isIsometricStage ? (
          <>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Mode 3D Grid</span>
          </>
        ) : (
          <>
            <Box className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>Mode 3D Stage</span>
          </>
        )}
      </button>

      {/* Main View Container */}
      <div
        className={`relative z-10 flex h-full w-full flex-col overflow-hidden transition-all duration-700 ease-out preserve-3d ${
          isIsometricStage && !heavyPlayback ? "isometric-kiosk-stage" : ""
        }`}
      >
        <SignageHeader
          now={now}
          screenName={payload.screen.name}
          isOnline={isOnline}
          appName={payload.widgets.appName}
          branchName={payload.widgets.branchName}
        />

        <div className="signage-main-grid relative z-10 min-h-0 flex-1 gap-[clamp(.5rem,1vw,.85rem)] px-[clamp(.5rem,1vw,.85rem)] pb-[clamp(.5rem,1vh,.85rem)] preserve-3d">
          <SignageScheduleBoard schedules={schedules} />
          <aside className="grid min-h-0 grid-rows-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-[clamp(.5rem,1vw,.85rem)] preserve-3d">
            <SignageMedia
              media={payload.media}
              announcements={payload.announcements}
              audioUnlocked={audioEnabled}
              performanceMode={heavyPlayback}
              onPlaybackPressureChange={setHeavyPlayback}
            />
            <SignageWidgets
              now={now}
              prayerTimes={prayerTimes}
              eventLabel={payload.widgets.eventLabel}
              eventDate={payload.widgets.eventDate}
            />
          </aside>
        </div>

        <SignageTicker messages={payload.tickers} now={now} />
      </div>
    </main>
  );
}
