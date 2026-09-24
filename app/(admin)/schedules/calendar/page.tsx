"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink, Clock, MapPin, User, LoaderCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { computeScheduleStatus, ComputedScheduleStatus, ScheduleManualStatus } from "@/domain/schedule-status";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface ScheduleRow {
  id: string;
  startAt: string;
  endAt: string;
  manualStatus: ScheduleManualStatus;
  class?: { name: string };
  subject?: { name: string };
  tutor?: { name: string; displayName?: string | null };
  room?: { name: string };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const STATUS_LABEL: Record<ComputedScheduleStatus, string> = {
  IN_PROGRESS: "Berlangsung",
  STARTING_SOON: "Segera Dimulai",
  SCHEDULED: "Terjadwal",
  COMPLETED: "Selesai",
  DELAYED: "Ditunda",
  CANCELLED: "Dibatalkan",
  MOVED_ROOM: "Pindah Ruangan",
  ONLINE: "Online",
};

const STATUS_VARIANT: Record<ComputedScheduleStatus, "success" | "warning" | "info" | "outline" | "destructive"> = {
  IN_PROGRESS: "success",
  STARTING_SOON: "warning",
  SCHEDULED: "info",
  COMPLETED: "outline",
  DELAYED: "destructive",
  CANCELLED: "destructive",
  MOVED_ROOM: "warning",
  ONLINE: "info",
};

function jakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function ScheduleCalendarPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => jakartaDateKey(new Date()));

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/v1/schedules", { cache: "no-store" });
        const body = (await response.json()) as ApiResponse<ScheduleRow[]>;
        if (body.success) setSchedules(body.data);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const schedulesByDay = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const sch of schedules) {
      const key = jakartaDateKey(new Date(sch.startAt));
      const list = map.get(key) ?? [];
      list.push(sch);
      map.set(key, list);
    }
    return map;
  }, [schedules]);

  const monthLabel = monthCursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const dayCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const cells: Array<{ day: number; dateKey: string } | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateKey });
    }
    return cells;
  }, [monthCursor]);

  const agenda = (schedulesByDay.get(selectedDateKey) ?? []).slice().sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const now = new Date();
  const selectedDateLabel = new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/schedules">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Kalender Jadwal Kelas</h1>
            <p className="text-sm text-muted-foreground">Tampilan kalender interaktif untuk memantau kepadatan sesi les.</p>
          </div>
        </div>
        <a href={GOOGLE_SHEETS_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" /> Edit Google Sheet
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold capitalize">{monthLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground py-2 border-b border-border">
              <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Ming</span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2 text-center text-sm py-4">
                {dayCells.map((cell, idx) =>
                  cell ? (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                        cell.dateKey === selectedDateKey
                          ? "bg-primary/20 border-primary text-primary font-bold"
                          : "border-border/50 hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <div>{cell.day}</div>
                      {schedulesByDay.has(cell.dateKey) && (
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary mx-auto" />
                      )}
                    </button>
                  ) : (
                    <div key={`empty-${idx}`} />
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Agenda */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Agenda {selectedDateLabel}
            </CardTitle>
            <CardDescription>Sesi les yang terjadwal untuk hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agenda.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Tidak ada jadwal pada tanggal ini.</p>
            ) : (
              agenda.map((sch) => {
                const status = computeScheduleStatus({
                  startAt: new Date(sch.startAt),
                  endAt: new Date(sch.endAt),
                  manualStatus: sch.manualStatus,
                  now,
                });
                return (
                  <div key={sch.id} className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sch.startAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                        {" - "}
                        {new Date(sch.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      </span>
                      <Badge variant={STATUS_VARIANT[status]} className="text-[10px]">
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {sch.subject?.name ?? "Mata Pelajaran"} — {sch.class?.name ?? "Kelas"}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" /> {sch.tutor?.displayName ?? sch.tutor?.name ?? "Tutor"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> {sch.room?.name ?? "Ruangan"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
