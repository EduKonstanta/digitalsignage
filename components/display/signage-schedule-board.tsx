import { DisplaySchedule, DisplayScheduleStatus } from "@/lib/display-data";

interface ScheduleBoardProps {
  schedules: DisplaySchedule[];
}

const statusConfig: Record<
  DisplayScheduleStatus,
  { label: string; className: string; priority: number }
> = {
  IN_PROGRESS: {
    label: "MULAI",
    className:
      "border-cyan-200/70 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,.38)] signage-pulse",
    priority: 1,
  },
  STARTING_SOON: {
    label: "SEGERA",
    className: "border-amber-300/50 bg-amber-400/15 text-amber-200",
    priority: 2,
  },
  DELAYED: {
    label: "TERLAMBAT",
    className: "border-amber-300/50 bg-amber-400/15 text-amber-200",
    priority: 3,
  },
  MOVED_ROOM: {
    label: "PINDAH",
    className: "border-violet-300/50 bg-violet-400/15 text-violet-200",
    priority: 3,
  },
  ONLINE: {
    label: "ONLINE",
    className: "border-blue-300/50 bg-blue-400/15 text-blue-200",
    priority: 3,
  },
  SCHEDULED: {
    label: "WAITING",
    className: "border-blue-300/30 bg-blue-400/10 text-blue-100",
    priority: 4,
  },
  COMPLETED: {
    label: "SELESAI",
    className: "border-slate-600/40 bg-slate-800 text-slate-500",
    priority: 5,
  },
  CANCELLED: {
    label: "BATAL",
    className: "border-red-400/50 bg-red-500/15 text-red-300",
    priority: 6,
  },
};

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function SignageScheduleBoard({ schedules }: ScheduleBoardProps) {
  return (
    <section className="signage-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 bg-black/30 px-[clamp(.8rem,1.3vw,1.4rem)] py-[clamp(.6rem,1vh,1rem)]">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-cyan-300/70">
              Live Academic Board
            </p>
            <h1 className="mt-0.5 text-[clamp(1.1rem,1.75vw,2rem)] font-black uppercase tracking-[0.08em] text-amber-300">
              Jadwal Kegiatan Hari Ini
            </h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {schedules.length} sesi
          </div>
        </div>
        <div className="signage-schedule-grid px-2 text-[clamp(.58rem,.75vw,.9rem)] font-black uppercase tracking-[0.14em] text-slate-500">
          <span>Waktu</span>
          <span>Kelas</span>
          <span>Mata Pelajaran</span>
          <span className="schedule-teacher">Pengajar</span>
          <span>Ruang</span>
          <span className="text-center">Status</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-black/10">
        {schedules.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-black uppercase tracking-[0.16em] text-slate-400">
              Belum ada jadwal hari ini
            </p>
            <p className="mt-2 text-xs text-slate-600">Jadwal baru akan tampil otomatis setelah dipublikasikan.</p>
          </div>
        ) : (
          schedules.map((schedule, index) => {
            const config = statusConfig[schedule.computedStatus] ?? statusConfig.SCHEDULED;
            const inactive = ["COMPLETED", "CANCELLED"].includes(schedule.computedStatus);

            return (
              <article
                key={schedule.id}
                className={`signage-schedule-grid items-center border-b border-white/[0.06] px-[clamp(.65rem,1vw,1.15rem)] py-[clamp(.55rem,1.1vh,1rem)] ${
                  index % 2 ? "bg-white/[0.025]" : "bg-transparent"
                } ${inactive ? "opacity-45 grayscale" : ""}`}
              >
                <p className="font-mono text-[clamp(.95rem,1.5vw,1.75rem)] font-black leading-none text-white">
                  {timeLabel(schedule.startAt)}
                  <span className="mt-1 block text-[.56em] font-semibold text-slate-500">
                    s.d. {timeLabel(schedule.endAt)}
                  </span>
                </p>
                <p className="truncate text-[clamp(.8rem,1.1vw,1.3rem)] font-bold text-cyan-300">
                  {schedule.className}
                </p>
                <p
                  className={`truncate text-[clamp(.95rem,1.45vw,1.75rem)] font-black uppercase leading-none text-white ${
                    schedule.computedStatus === "CANCELLED" ? "line-through" : ""
                  }`}
                >
                  {schedule.subject}
                </p>
                <p className="schedule-teacher truncate text-[clamp(.75rem,1vw,1.2rem)] font-semibold text-slate-300">
                  {schedule.teacher}
                </p>
                <p className="truncate font-mono text-[clamp(.75rem,1vw,1.15rem)] font-black text-amber-300">
                  {schedule.room}
                </p>
                <div className="flex justify-center">
                  <span
                    className={`w-full truncate rounded-full border px-2 py-1 text-center text-[clamp(.58rem,.85vw,1rem)] font-black uppercase tracking-[0.12em] ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
