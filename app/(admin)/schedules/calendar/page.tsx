"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ScheduleCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState("Juli 2026");

  const events = [
    {
      time: "08:00 - 09:30",
      title: "Penalaran Matematika — 12 IPA 1",
      tutor: "KG Fikri, S.Si",
      room: "Ruang 201",
      badge: "Berlangsung",
      variant: "success" as const,
    },
    {
      time: "10:00 - 11:30",
      title: "Bahasa Inggris Lanjutan — 11 IPS 2",
      tutor: "KG Anita, M.Pd",
      room: "Ruang 102",
      badge: "Segera Dimulai",
      variant: "warning" as const,
    },
    {
      time: "13:30 - 15:00",
      title: "Fisika Dasar — 10 Intensive",
      tutor: "KG Budi, M.T",
      room: "Ruang 204",
      badge: "Terjadwal",
      variant: "info" as const,
    },
  ];

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
        <Link href="/schedules/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> + Tambah Jadwal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{currentMonth}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground py-2 border-b border-border">
              <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Ming</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm py-4">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <div
                  key={day}
                  className={`p-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    day === 28
                      ? "bg-primary/20 border-primary text-primary font-bold"
                      : "border-border/50 hover:border-primary/50 text-foreground"
                  }`}
                >
                  <div>{day}</div>
                  {day % 4 === 0 && (
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary mx-auto" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Agenda */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Agenda 28 Juli 2026
            </CardTitle>
            <CardDescription>Sesi les yang terjadwal untuk hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((ev, idx) => (
              <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ev.time}
                  </span>
                  <Badge variant={ev.variant} className="text-[10px]">
                    {ev.badge}
                  </Badge>
                </div>
                <h4 className="text-xs font-semibold text-foreground">{ev.title}</h4>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" /> {ev.tutor}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" /> {ev.room}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
