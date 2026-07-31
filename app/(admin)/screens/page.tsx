"use client";

import React, { useState } from "react";
import { Tv, Plus, Search, Wifi, Radio, QrCode } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ScreensPage() {
  const [search, setSearch] = useState("");

  const screens = [
    { id: "1", name: "TV Lobby Utama", room: "Lobby Utama", branch: "Cabang Utama Jakarta", status: "ONLINE", resolution: "1920x1080", lastSeen: "Baru saja" },
    { id: "2", name: "TV Ruang Tunggu Lt 1", room: "Waiting Area", branch: "Cabang Utama Jakarta", status: "ONLINE", resolution: "1920x1080", lastSeen: "1m yang lalu" },
    { id: "3", name: "TV Koridor Lt 2", room: "Koridor Lt 2", branch: "Cabang Utama Jakarta", status: "ONLINE", resolution: "1920x1080", lastSeen: "Baru saja" },
    { id: "4", name: "TV Ruang Guru", room: "Staff Room", branch: "Cabang Utama Jakarta", status: "ONLINE", resolution: "1280x720", lastSeen: "2m yang lalu" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kelola Perangkat Display</h1>
          <p className="text-sm text-muted-foreground">Status koneksi, pairing code, dan penugasan playlist TV display.</p>
        </div>
        <Link href="/screens/pairing">
          <Button size="sm" className="gap-2">
            <QrCode className="h-4 w-4" /> + Pair TV Baru
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari layar..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {screens.map((s) => (
          <Card key={s.id} className="border-border/80 hover:border-primary/40 transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="text-[10px]">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" /> {s.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">{s.resolution}</span>
              </div>
              <CardTitle className="text-base font-bold mt-2">{s.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">{s.room}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
              <div className="pt-2 border-t border-border/60 flex justify-between">
                <span>Last Seen:</span>
                <span className="font-mono text-foreground">{s.lastSeen}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
