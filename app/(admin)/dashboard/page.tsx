"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Tv,
  Megaphone,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Sparkles,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { use3DTilt } from "@/lib/use-3d-tilt";
import type { ComputedScheduleStatus } from "@/domain/schedule-status";

function KPICard3D({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  glowColor,
}: {
  title: string;
  value: string;
  subtitle: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  glowColor: string;
}) {
  const { tiltStyle, glareStyle, handleMouseMove, handleMouseLeave } = use3DTilt({
    maxTilt: 10,
    scale: 1.03,
  });

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className={`glass-3d-panel relative overflow-hidden p-5 transition-all duration-300 preserve-3d cursor-pointer hover:${glowColor}`}
    >
      <div style={glareStyle} className="absolute inset-0 rounded-2xl pointer-events-none" />
      <div className="flex items-center justify-between pb-2 preserve-3d">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border border-white/10 bg-slate-900/80 ${iconColor} shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-2 preserve-3d">
        <div className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          {value}
        </div>
        <div className="mt-1 text-xs font-bold">{subtitle}</div>
      </div>
    </div>
  );
}

interface ScheduleRow {
  id: string;
  startAt: string;
  endAt: string;
  computedStatus: ComputedScheduleStatus;
  class: { name: string };
  subject: { name: string };
  tutor: { displayName: string | null; name: string };
  room: { name: string };
}

interface AnnouncementRow {
  id: string;
  priority: number;
  status: string;
  startsAt: string;
  endsAt: string;
}

interface ScreenRow {
  id: string;
  name: string;
  status: string;
  lastSeenAt: string | null;
  room: { name: string } | null;
  branch: { name: string } | null;
}

interface EmergencyRow {
  id: string;
  title: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const STATUS_LABEL: Record<ComputedScheduleStatus, string> = {
  IN_PROGRESS: "Sedang Berlangsung",
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

function todayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTimeRange(startAt: string, endAt: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return `${fmt(startAt)} - ${fmt(endAt)}`;
}

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [emergency, setEmergency] = useState<EmergencyRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [scheduleRes, announcementRes, screenRes, emergencyRes] = await Promise.all([
          fetch(`/api/v1/schedules?date=${todayDateKey()}`, { cache: "no-store" }),
          fetch("/api/v1/announcements", { cache: "no-store" }),
          fetch("/api/v1/screens", { cache: "no-store" }),
          fetch("/api/v1/emergency", { cache: "no-store" }),
        ]);
        const [scheduleBody, announcementBody, screenBody, emergencyBody] = await Promise.all([
          scheduleRes.json() as Promise<ApiResponse<ScheduleRow[]>>,
          announcementRes.json() as Promise<ApiResponse<AnnouncementRow[]>>,
          screenRes.json() as Promise<ApiResponse<ScreenRow[]>>,
          emergencyRes.json() as Promise<ApiResponse<EmergencyRow | null>>,
        ]);
        if (scheduleBody.success) setSchedules(scheduleBody.data);
        if (announcementBody.success) setAnnouncements(announcementBody.data);
        if (screenBody.success) setScreens(screenBody.data);
        if (emergencyBody.success) setEmergency(emergencyBody.data);
        setLoadError(null);
      } catch (error) {
        // Tanpa catch, kegagalan fetch membuat semua KPI tampil 0 seolah-olah
        // cabang benar-benar sepi, padahal datanya gagal dimuat.
        setLoadError(
          error instanceof Error
            ? `Gagal memuat data dashboard: ${error.message}`
            : "Gagal memuat data dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const now = new Date();
  const activeAnnouncements = announcements.filter(
    (a) => a.status === "PUBLISHED" && new Date(a.startsAt) <= now && new Date(a.endsAt) >= now,
  );
  const highPriorityAnnouncements = activeAnnouncements.filter((a) => a.priority >= 2);
  const inProgressCount = schedules.filter((s) => s.computedStatus === "IN_PROGRESS").length;
  const onlineScreens = screens.filter((s) => s.status === "ONLINE").length;

  const upcomingSchedules = useMemo(
    () =>
      [...schedules]
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 5),
    [schedules],
  );

  return (
    <div className="space-y-8 perspective-1000">
      {/* Page Header with 3D Holographic Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-3d-panel p-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="h-4 w-4" /> 3D Operational Command Center
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Ringkasan Operasional
          </h1>
          <p className="text-sm font-medium text-slate-300 mt-1">
            Monitoring status jadwal kelas, pengumuman, dan display TV secara real-time dengan visualisasi 3D spatial.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/schedules/new">
            <Button size="default" className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform">
              <Calendar className="h-4 w-4" />
              + Tambah Jadwal
            </Button>
          </Link>
          <Link href="/emergency">
            <Button size="default" variant="emergency" className="gap-2 font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 transition-transform">
              <AlertOctagon className="h-4 w-4" />
              Emergency Broadcast
            </Button>
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {/* KPI Cards Grid with 3D Holographic Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 preserve-3d">
        <KPICard3D
          title="Kelas Berlangsung"
          value={isLoading ? "…" : `${inProgressCount} Kelas`}
          subtitle={
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {schedules.length} jadwal hari ini
            </span>
          }
          icon={Clock}
          iconColor="text-emerald-400"
          glowColor="shadow-[0_0_30px_rgba(52,211,153,0.3)]"
        />

        <KPICard3D
          title="Layar Display Active"
          value={isLoading ? "…" : `${onlineScreens} / ${screens.length} TV`}
          subtitle={
            <span className="text-cyan-400 flex items-center gap-1">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              {screens.length ? `${Math.round((onlineScreens / screens.length) * 100)}% Online` : "Belum ada layar"}
            </span>
          }
          icon={Tv}
          iconColor="text-cyan-400"
          glowColor="shadow-[0_0_30px_rgba(6,182,212,0.3)]"
        />

        <KPICard3D
          title="Pengumuman Aktif"
          value={isLoading ? "…" : `${activeAnnouncements.length} Tayang`}
          subtitle={
            <span className="text-amber-300">{highPriorityAnnouncements.length} Pengumuman Prioritas Tinggi</span>
          }
          icon={Megaphone}
          iconColor="text-amber-400"
          glowColor="shadow-[0_0_30px_rgba(251,191,36,0.3)]"
        />

        <KPICard3D
          title="Status Darurat"
          value={emergency ? "AKTIF" : "Normal"}
          subtitle={
            emergency ? (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> {emergency.title}
              </span>
            ) : (
              <span className="text-slate-300">Tidak ada broadcast darurat</span>
            )
          }
          icon={ShieldAlert}
          iconColor={emergency ? "text-rose-400" : "text-indigo-400"}
          glowColor={emergency ? "shadow-[0_0_30px_rgba(244,63,94,0.35)]" : "shadow-[0_0_30px_rgba(129,140,248,0.3)]"}
        />
      </div>

      {/* Main Grid: Active Schedules & 3D TV Screen Heartbeat Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 preserve-3d">
        {/* Left 2 Cols: Active Schedules */}
        <div className="lg:col-span-2 glass-3d-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                Jadwal Kelas Hari Ini
              </h2>
              <p className="text-xs text-slate-400">Sesi les aktif dan akan datang pada Cabang Utama</p>
            </div>
            <Link href="/schedules">
              <Button variant="outline" size="sm" className="gap-1 text-xs border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20">
                Lihat Semua <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Memuat jadwal...</p>
            ) : upcomingSchedules.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada jadwal untuk hari ini.</p>
            ) : (
              upcomingSchedules.map((sch) => (
                <div
                  key={sch.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-400/40 transition-all gap-3 shadow-md hover:translate-x-1"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{sch.class.name}</span>
                      <Badge variant={STATUS_VARIANT[sch.computedStatus]}>{STATUS_LABEL[sch.computedStatus]}</Badge>
                    </div>
                    <p className="text-xs text-slate-300">
                      <span className="font-bold text-cyan-300">{sch.subject.name}</span> •{" "}
                      {sch.tutor.displayName ?? sch.tutor.name}
                    </p>
                  </div>
                  <div className="text-right sm:text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-cyan-400">
                      {formatTimeRange(sch.startAt, sch.endAt)}
                    </div>
                    <div className="text-[11px] font-semibold text-amber-300">{sch.room.name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Screen Status Monitor */}
        <div className="glass-3d-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                Status Display TV
              </h2>
              <p className="text-xs text-slate-400">Status koneksi layar terdaftar</p>
            </div>
            <Link href="/screens">
              <Button variant="ghost" size="sm" className="text-xs text-cyan-300">
                Detail
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Memuat layar...</p>
            ) : screens.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada layar terdaftar.</p>
            ) : (
              screens.slice(0, 4).map((scr) => (
                <div
                  key={scr.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-white/10 hover:border-cyan-400/40 transition-all shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        scr.status === "ONLINE"
                          ? "bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"
                          : "bg-slate-500"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{scr.name}</div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {scr.room?.name ?? scr.branch?.name ?? "Belum ditempatkan"}
                      </div>
                    </div>
                  </div>
                  <Badge variant={scr.status === "ONLINE" ? "success" : "outline"} className="text-[10px] font-mono">
                    {scr.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
