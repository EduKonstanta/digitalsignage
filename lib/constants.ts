export const SESSION_COOKIE_NAME = "ke_admin_session";

export const APP_NAME = "KE Digital Signage";
export const APP_TAGLINE = "Grow · Innovative · Engage";
export const ORG_NAME = "Konstanta Education";

export const RESOLUTIONS = {
  HD_720P: { width: 1280, height: 720, label: "720p (HD)" },
  FHD_1080P: { width: 1920, height: 1080, label: "1080p (Full HD)" },
  UHD_4K: { width: 3840, height: 2160, label: "4K (Ultra HD)" },
} as const;

export const COMPUTED_SCHEDULE_STATUS_COLORS = {
  SCHEDULED: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", label: "Terjadwal" },
  STARTING_SOON: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", label: "Segera Dimulai" },
  IN_PROGRESS: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: "Sedang Berlangsung" },
  COMPLETED: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", label: "Selesai" },
  DELAYED: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", label: "Terlambat" },
  CANCELLED: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", label: "Dibatalkan" },
  MOVED_ROOM: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", label: "Pindah Ruangan" },
  ONLINE: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", label: "Kelas Online" },
} as const;

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
export const DEFAULT_SSE_RECONNECT_MS = 5000;

/**
 * Parameter query yang memberi tahu server layar terdaftar mana yang sedang
 * membuka /display, mis. /display?screen=SCR-1A2B3C4D5E. Berisi deviceId layar,
 * bukan rahasia: tampilan TV memang publik.
 */
export const SCREEN_QUERY_PARAM = "screen";
