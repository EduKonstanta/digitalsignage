"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
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

export function SignageScreen() {
  const [payload, setPayload] = useState<DisplayPayload>(EMPTY_PAYLOAD);
  const [now, setNow] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const playedVoiceIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/display", { cache: "no-store" });
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

  useEffect(() => {
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const pending = payload.voices.filter((voice) => !playedVoiceIds.current.has(voice.id));
    if (!pending.length) return;

    for (const voice of pending) {
      playedVoiceIds.current.add(voice.id);
      const playSpeech = () => {
        if (voice.audioUrl) {
          const audio = new Audio(voice.audioUrl);
          audio.volume = voice.volume / 100;
          void audio.play().catch(() => undefined);
          return;
        }
        let count = 0;
        const speak = () => {
          const utterance = new SpeechSynthesisUtterance(voice.text);
          utterance.lang = voice.language;
          utterance.volume = voice.volume / 100;
          const selectedVoice = window.speechSynthesis
            .getVoices()
            .find((candidate) => candidate.name === voice.voiceName || candidate.lang === voice.language);
          if (selectedVoice) utterance.voice = selectedVoice;
          count += 1;
          if (count < voice.repetitions) {
            utterance.onend = () => window.setTimeout(speak, voice.intervalSeconds * 1000);
          }
          window.speechSynthesis.speak(utterance);
        };
        speak();
      };

      if (voice.openingAudioUrl) {
        const opening = new Audio(voice.openingAudioUrl);
        opening.volume = voice.volume / 100;
        opening.onended = playSpeech;
        void opening.play().catch(playSpeech);
      } else {
        playSpeech();
      }
    }
  }, [payload.voices]);

  useEffect(() => {
    void refresh();
    const sync = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(sync);
  }, [refresh]);

  useEffect(() => {
    const loadPrayerTimes = async () => {
      try {
        const response = await fetch(
          "https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=Indonesia&method=11",
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
  }, []);

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
    <main className="relative flex h-screen w-screen select-none flex-col overflow-hidden bg-[#050912] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_-10%,rgba(6,182,212,.16),transparent_42%),radial-gradient(circle_at_90%_90%,rgba(212,175,55,.08),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />

      <SignageHeader
        now={now}
        screenName={payload.screen.name}
        isOnline={isOnline}
      />

      <div className="signage-main-grid relative z-10 min-h-0 flex-1 gap-[clamp(.65rem,1vw,1rem)] px-[clamp(.65rem,1vw,1rem)] pb-[clamp(.65rem,1vh,1rem)]">
        <SignageScheduleBoard schedules={schedules} />
        <aside className="grid min-h-0 grid-rows-[minmax(0,1.12fr)_minmax(0,.88fr)] gap-[clamp(.65rem,1vw,1rem)]">
          <SignageMedia media={payload.media} announcements={payload.announcements} />
          <SignageWidgets now={now} prayerTimes={prayerTimes} />
        </aside>
      </div>

      <SignageTicker messages={payload.tickers} now={now} />
    </main>
  );
}
