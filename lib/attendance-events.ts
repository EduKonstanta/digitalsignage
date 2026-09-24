import { EventEmitter } from "events";

export interface AttendanceTapEvent {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  className: string;
  voiceGender: "AUTO" | "MALE" | "FEMALE";
  cardUid: string | null;
  photoUrl: string | null;
  type: "CHECK_IN" | "CHECK_OUT";
  timestamp: string;
  timeFormatted: string;
  deviceId?: string | null;
  fonnteStatus: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "DISABLED" | "SKIPPED";
  parentPhone?: string | null;
}

// Global in-memory singleton EventEmitter for Next.js server runtime
const globalForEvents = globalThis as unknown as {
  attendanceEmitter?: EventEmitter;
};

export const attendanceEmitter =
  globalForEvents.attendanceEmitter ?? new EventEmitter();

// Allow unlimited listeners for connected SSE display screens
attendanceEmitter.setMaxListeners(100);

globalForEvents.attendanceEmitter = attendanceEmitter;

export function broadcastAttendanceTap(event: AttendanceTapEvent) {
  attendanceEmitter.emit("attendance_tap", event);
}
