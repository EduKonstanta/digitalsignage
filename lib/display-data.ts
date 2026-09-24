export type DisplayScheduleStatus =
  | "SCHEDULED"
  | "STARTING_SOON"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "CANCELLED"
  | "MOVED_ROOM"
  | "ONLINE";

export interface DisplaySchedule {
  id: string;
  startAt: string;
  endAt: string;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  computedStatus: DisplayScheduleStatus;
}

export interface DisplayAnnouncement {
  id: string;
  title: string;
  summary: string | null;
  priority: number;
  imageUrl: string | null;
}

export interface DisplayMedia {
  id: string;
  name: string;
  mediaType: string;
  fileUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
}

export interface DisplayTicker {
  id: string;
  text: string;
  priority: number;
  speed: number;
}

export interface DisplayVoice {
  id: string;
  text: string;
  audioUrl: string | null;
  openingAudioUrl: string | null;
  voiceName: string;
  language: string;
  volume: number;
  repetitions: number;
  intervalSeconds: number;
  scheduledAt: string;
  priority: number;
}

export interface DisplayEmergency {
  id: string;
  title: string;
  instruction: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  voiceEnabled: boolean;
}

export interface DisplayWidgetsConfig {
  /** Nama aplikasi/lembaga yang tampil di header TV. */
  appName: string;
  /** Nama cabang yang tampil di header TV. */
  branchName: string;
  /** Nama acara/ujian untuk widget countdown (mis. "Ujian TKA"). Kosong = otomatis "UTBK <tahun>". */
  eventLabel: string | null;
  /** Tanggal target countdown (YYYY-MM-DD). Kosong = otomatis 21 April tahun berjalan/berikutnya. */
  eventDate: string | null;
  /** Kota untuk jadwal sholat, sesuai API Aladhan.com (mis. "Jakarta"). */
  prayerCity: string;
}

export interface DisplayPayload {
  screen: {
    name: string;
    deviceId: string;
    resolution: string;
  };
  schedules: DisplaySchedule[];
  announcements: DisplayAnnouncement[];
  media: DisplayMedia[];
  tickers: DisplayTicker[];
  voices: DisplayVoice[];
  emergency: DisplayEmergency | null;
  widgets: DisplayWidgetsConfig;
  generatedAt: string;
}
