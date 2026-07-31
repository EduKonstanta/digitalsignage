import { computeScheduleStatus, ScheduleManualStatus } from "@/domain/schedule-status";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const now = new Date();
    const dateKey = jakartaDateKey(now);
    const dayStart = new Date(`${dateKey}T00:00:00+07:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [screen, schedules, announcements, media, tickers, voices, emergency] = await Promise.all([
      db.screen.findFirst({
        where: { revokedAt: null },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      }),
      db.schedule.findMany({
        where: {
          archivedAt: null,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        include: {
          class: true,
          subject: true,
          tutor: true,
          room: true,
        },
        orderBy: { startAt: "asc" },
      }),
      db.announcement.findMany({
        where: {
          status: "PUBLISHED",
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
        take: 6,
      }),
      db.mediaAsset.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      db.runningText.findMany({
        where: {
          status: "PUBLISHED",
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 12,
      }),
      db.voiceAnnouncement.findMany({
        where: {
          status: { in: ["SCHEDULED", "PUBLISHED"] },
          scheduledAt: {
            lte: now,
            gte: new Date(now.getTime() - 10 * 60 * 1000),
          },
        },
        orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
        take: 5,
      }),
      db.emergencyBroadcast.findFirst({
        where: { endedAt: null, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return apiSuccess({
      screen: {
        name: screen?.name ?? "TV Display Lobby Utama",
        deviceId: screen?.deviceId ?? "TV-LOBBY-01",
        resolution: screen?.resolution ?? "1920x1080",
      },
      schedules: schedules.map((schedule) => ({
        id: schedule.id,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        className: schedule.class.name,
        subject: schedule.subject.name,
        teacher: schedule.tutor.displayName ?? schedule.tutor.name,
        room: schedule.room.name,
        computedStatus: computeScheduleStatus({
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          manualStatus: schedule.manualStatus as ScheduleManualStatus,
          now,
        }),
      })),
      announcements: announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        summary: announcement.summary,
        priority: announcement.priority,
        imageUrl: announcement.imageUrl,
      })),
      media: media.map((item) => ({
        id: item.id,
        name: item.name,
        mediaType: item.mediaType,
        fileUrl: item.fileUrl,
        externalUrl: item.externalUrl,
        thumbnailUrl: item.thumbnailUrl,
        durationSeconds: item.durationSeconds,
      })),
      tickers: tickers.map((ticker) => ({
        id: ticker.id,
        text: ticker.text,
        priority: ticker.priority,
        speed: ticker.speed,
      })),
      voices: voices.map((voice) => ({
        id: voice.id,
        text: voice.text,
        audioUrl: voice.audioUrl,
        openingAudioUrl: voice.openingAudioUrl,
        voiceName: voice.voiceName,
        language: voice.language,
        volume: voice.volume,
        repetitions: voice.repetitions,
        intervalSeconds: voice.intervalSeconds,
        scheduledAt: voice.scheduledAt,
        priority: voice.priority,
      })),
      emergency: emergency
        ? {
            id: emergency.id,
            title: emergency.title,
            instruction: emergency.instruction,
            severity: emergency.severity,
            voiceEnabled: emergency.voiceEnabled,
          }
        : null,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    return apiError("Gagal menyiapkan data layar display", "DISPLAY_FETCH_ERROR", 500, error);
  }
}
