"use client";

import React, { useState } from "react";
import { Calendar, Plus, Search, Filter, Clock, MapPin, User, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function SchedulesPage() {
  const [search, setSearch] = useState("");

  const schedules = [
    {
      id: "1",
      time: "16:00 - 17:30",
      class: "12 IPA 1 — SNBT Superior",
      subject: "Penalaran Matematika & TPS",
      tutor: "Kang Guru Fikri, S.Si",
      room: "Ruang 201 (Lt 2)",
      branch: "Cabang Utama Jakarta",
      statusLabel: "Sedang Berlangsung",
      variant: "success" as const,
    },
    {
      id: "2",
      time: "16:00 - 17:30",
      class: "11 IPS 2 — Reguler",
      subject: "Bahasa Inggris Lanjutan",
      tutor: "Kang Guru Anita, M.Pd",
      room: "Ruang 102 (Lt 1)",
      branch: "Cabang Utama Jakarta",
      statusLabel: "Sedang Berlangsung",
      variant: "success" as const,
    },
    {
      id: "3",
      time: "18:00 - 19:30",
      class: "10 SMA Intensive",
      subject: "Fisika Dasar & Pembahasan Soal",
      tutor: "Kang Guru Budi, M.T",
      room: "Ruang 204 (Lt 2)",
      branch: "Cabang Utama Jakarta",
      statusLabel: "Segera Dimulai (15m)",
      variant: "warning" as const,
    },
    {
      id: "4",
      time: "18:00 - 19:30",
      class: "12 IPA 2 — Intensif",
      subject: "Kimia Organik & Stoikiometri",
      tutor: "Kang Guru Sarah, S.Si",
      room: "Ruang 301 (Lt 3)",
      branch: "Cabang Utama Jakarta",
      statusLabel: "Terjadwal",
      variant: "info" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kelola Jadwal Kelas</h1>
          <p className="text-sm text-muted-foreground">Buat, publish, dan atur jadwal les real-time pada layar display.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/schedules/calendar">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" /> Kalender
            </Button>
          </Link>
          <Link href="/schedules/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> + Tambah Jadwal
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kelas, tutor, atau mata pelajaran..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" /> Filter Status
          </Button>
        </div>
      </div>

      {/* Schedule Cards List */}
      <div className="space-y-3">
        {schedules.map((s) => (
          <Card key={s.id} className="border-border/80 hover:border-primary/40 transition-all">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">{s.class}</span>
                  <Badge variant={s.variant}>{s.statusLabel}</Badge>
                </div>
                <p className="text-sm font-semibold text-primary">{s.subject}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> {s.tutor}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {s.room}
                  </span>
                  <span>{s.branch}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right self-end md:self-center">
                <div className="text-right">
                  <div className="font-mono text-base font-bold text-foreground">{s.time}</div>
                  <div className="text-[10px] text-muted-foreground">Selasa, 28 Juli 2026</div>
                </div>
                <Button variant="ghost" size="icon">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
