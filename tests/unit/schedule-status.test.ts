import { describe, it, expect } from "vitest";
import { computeScheduleStatus } from "@/domain/schedule-status";

describe("computeScheduleStatus Domain Engine", () => {
  const baseStart = new Date("2026-07-28T16:00:00Z");
  const baseEnd = new Date("2026-07-28T17:30:00Z");

  it("returns COMPLETED when current time is past endAt", () => {
    const now = new Date("2026-07-28T17:30:01Z");
    const status = computeScheduleStatus({ startAt: baseStart, endAt: baseEnd, now });
    expect(status).toBe("COMPLETED");
  });

  it("returns IN_PROGRESS when current time is between startAt and endAt", () => {
    const now = new Date("2026-07-28T16:45:00Z");
    const status = computeScheduleStatus({ startAt: baseStart, endAt: baseEnd, now });
    expect(status).toBe("IN_PROGRESS");
  });

  it("returns STARTING_SOON when current time is within 15 minutes before startAt", () => {
    const now = new Date("2026-07-28T15:50:00Z");
    const status = computeScheduleStatus({ startAt: baseStart, endAt: baseEnd, now });
    expect(status).toBe("STARTING_SOON");
  });

  it("returns SCHEDULED when current time is more than 15 minutes before startAt", () => {
    const now = new Date("2026-07-28T14:00:00Z");
    const status = computeScheduleStatus({ startAt: baseStart, endAt: baseEnd, now });
    expect(status).toBe("SCHEDULED");
  });

  it("respects manualStatus CANCELLED override regardless of timing", () => {
    const now = new Date("2026-07-28T16:45:00Z");
    const status = computeScheduleStatus({
      startAt: baseStart,
      endAt: baseEnd,
      manualStatus: "CANCELLED",
      now,
    });
    expect(status).toBe("CANCELLED");
  });
});
