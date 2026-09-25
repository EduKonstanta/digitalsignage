import { NextRequest } from "next/server";
import { attendanceEmitter, AttendanceTapEvent } from "@/lib/attendance-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dibaca langsung oleh halaman /display tanpa login atau pairing. Event yang
// dipancarkan route tap sudah dibersihkan dari UID kartu dan nomor telepon.
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: "connected",
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      let closed = false;

      /**
       * Satu jalur pembersihan untuk semua penyebab koneksi berakhir. Sebelumnya
       * kegagalan heartbeat hanya menghentikan interval tanpa melepas listener,
       * sehingga handler menumpuk di attendanceEmitter (batas 100 listener)
       * setiap kali koneksi mati tanpa event "abort".
       */
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        attendanceEmitter.off("attendance_tap", handleAttendanceTap);
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      // Listener for live student card tap attendance events
      const handleAttendanceTap = (event: AttendanceTapEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: attendance_tap\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch (err) {
          console.error("SSE enqueue error:", err);
          cleanup();
        }
      };

      attendanceEmitter.on("attendance_tap", handleAttendanceTap);

      // Ping heartbeats every 15 seconds to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ping\ndata: ${JSON.stringify({
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      }, 15000);

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
