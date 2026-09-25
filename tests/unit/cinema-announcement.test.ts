import { describe, expect, it } from "vitest";
import {
  formatPreClassAnnouncementText,
  isPreClassReminderDue,
} from "@/lib/cinema-announcement";

describe("pre-class announcements", () => {
  const startAt = new Date("2026-09-25T03:00:00.000Z");

  it("starts the reminder at most ten minutes before class", () => {
    expect(isPreClassReminderDue(startAt, new Date("2026-09-25T02:50:00.000Z"))).toBe(true);
    expect(isPreClassReminderDue(startAt, new Date("2026-09-25T02:49:59.000Z"))).toBe(false);
  });

  it("does not announce after class has started", () => {
    expect(isPreClassReminderDue(startAt, startAt)).toBe(false);
  });

  it("creates a concise, complete Indonesian announcement", () => {
    expect(
      formatPreClassAnnouncementText({
        subject: "Matematika",
        className: "12 ELC 1",
        teacher: "Ibu Anita",
        room: "Ruang Sigma",
      }),
    ).toBe(
      "Perhatian. Sepuluh menit lagi, kelas Matematika untuk 12 ELC 1, bersama Ibu Anita, akan dimulai di Ruang Sigma. Mohon siswa segera menuju ruang kelas dan menyiapkan perlengkapan belajar. Terima kasih.",
    );
  });
});
