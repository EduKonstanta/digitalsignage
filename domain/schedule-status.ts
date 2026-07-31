export type ScheduleManualStatus =
  | "NONE"
  | "DELAYED"
  | "CANCELLED"
  | "MOVED_ROOM"
  | "ONLINE";

export type ComputedScheduleStatus =
  | "SCHEDULED"
  | "STARTING_SOON"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "CANCELLED"
  | "MOVED_ROOM"
  | "ONLINE";

export interface ScheduleStatusInput {
  startAt: Date;
  endAt: Date;
  manualStatus?: ScheduleManualStatus;
  now?: Date;
  startingSoonThresholdMinutes?: number;
}

export function computeScheduleStatus({
  startAt,
  endAt,
  manualStatus = "NONE",
  now = new Date(),
  startingSoonThresholdMinutes = 15,
}: ScheduleStatusInput): ComputedScheduleStatus {
  // Manual overrides take highest priority if non-NONE
  if (manualStatus === "CANCELLED") return "CANCELLED";
  if (manualStatus === "MOVED_ROOM") return "MOVED_ROOM";
  if (manualStatus === "ONLINE") return "ONLINE";
  if (manualStatus === "DELAYED") return "DELAYED";

  const nowMs = now.getTime();
  const startMs = startAt.getTime();
  const endMs = endAt.getTime();

  if (nowMs >= endMs) {
    return "COMPLETED";
  }

  if (nowMs >= startMs && nowMs < endMs) {
    return "IN_PROGRESS";
  }

  const thresholdMs = startingSoonThresholdMinutes * 60 * 1000;
  if (nowMs < startMs && startMs - nowMs <= thresholdMs) {
    return "STARTING_SOON";
  }

  return "SCHEDULED";
}
