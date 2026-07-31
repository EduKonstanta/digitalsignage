"use client";

import React from "react";
import {
  Calendar,
  Tv,
  Megaphone,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertOctagon,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ringkasan Operasional
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau status jadwal kelas, pengumuman, dan layar display real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/schedules/new">
            <Button size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              + Tambah Jadwal
            </Button>
          </Link>
          <Link href="/emergency">
            <Button size="sm" variant="emergency" className="gap-2">
              <AlertOctagon className="h-4 w-4" />
              Emergency Broadcast
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/60 backdrop-blur border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Kelas Berlangsung
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8 Kelas</div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Semua ruangan sesuai jadwal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Layar Display Active
            </CardTitle>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Tv className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12 / 12</div>
            <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1 font-medium">
              <Radio className="h-3 w-3 animate-pulse" />
              100% Online & Synced
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pengumuman Aktif
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Megaphone className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">4 Tayang</div>
            <p className="text-xs text-muted-foreground mt-1">2 Pengumuman Prioritas Tinggi</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Status Sinkronisasi
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Normal</div>
            <p className="text-xs text-muted-foreground mt-1">Google Sheets auto-sync aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Schedules & Screen Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Schedules */}
        <Card className="lg:col-span-2 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Jadwal Kelas Hari Ini</CardTitle>
              <CardDescription>Sesi les aktif dan akan datang pada Cabang Utama</CardDescription>
            </div>
            <Link href="/schedules">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                Lihat Semua <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  id: "1",
                  time: "16:00 - 17:30",
                  class: "12 IPA 1 (SNBT Superior)",
                  subject: "Penalaran Matematika",
                  tutor: "Kang Guru Fikri, S.Si",
                  room: "Ruang 201 (Lantai 2)",
                  status: "IN_PROGRESS",
                  statusLabel: "Sedang Berlangsung",
                  variant: "success" as const,
                },
                {
                  id: "2",
                  time: "16:00 - 17:30",
                  class: "11 IPS 2 (Reguler)",
                  subject: "Bahasa Inggris",
                  tutor: "Kang Guru Anita, M.Pd",
                  room: "Ruang 102 (Lantai 1)",
                  status: "IN_PROGRESS",
                  statusLabel: "Sedang Berlangsung",
                  variant: "success" as const,
                },
                {
                  id: "3",
                  time: "18:00 - 19:30",
                  class: "10 SMA Intensive",
                  subject: "Fisika Dasar",
                  tutor: "Kang Guru Budi, M.T",
                  room: "Ruang 204 (Lantai 2)",
                  status: "STARTING_SOON",
                  statusLabel: "Segera Dimulai (15m)",
                  variant: "warning" as const,
                },
                {
                  id: "4",
                  time: "18:00 - 19:30",
                  class: "12 IPA 2 (Intensif)",
                  subject: "Kimia Organik",
                  tutor: "Kang Guru Sarah, S.Si",
                  room: "Ruang 301 (Lantai 3)",
                  status: "SCHEDULED",
                  statusLabel: "Terjadwal",
                  variant: "info" as const,
                },
              ].map((sch) => (
                <div
                  key={sch.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-border/60 bg-card/40 hover:bg-card/80 transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{sch.class}</span>
                      <Badge variant={sch.variant}>{sch.statusLabel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{sch.subject}</span> • {sch.tutor}
                    </p>
                  </div>
                  <div className="text-right sm:text-right shrink-0">
                    <div className="text-xs font-mono font-medium text-primary">{sch.time}</div>
                    <div className="text-[11px] text-muted-foreground">{sch.room}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Screen Heartbeat Monitor */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Status Display TV</CardTitle>
              <CardDescription>Heartbeat real-time</CardDescription>
            </div>
            <Link href="/screens">
              <Button variant="ghost" size="sm" className="text-xs">
                Detail
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "TV Lobby Utama (FHD)", room: "Lobby", status: "Online", drift: "+0.2s" },
              { name: "TV Ruang Tunggu LT1", room: "Waiting Area", status: "Online", drift: "-0.1s" },
              { name: "TV Koridor Lt 2", room: "Koridor Lt 2", status: "Online", drift: "+0.5s" },
              { name: "TV Ruang Guru", room: "Staff Room", status: "Online", drift: "0.0s" },
            ].map((scr, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-background/50 border border-border/40">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-medium text-foreground">{scr.name}</div>
                    <div className="text-[10px] text-muted-foreground">{scr.room}</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {scr.drift}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
