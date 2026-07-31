"use client";

import React, { useState } from "react";
import { History, Search, User, Clock, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ActivityLogsPage() {
  const [search, setSearch] = useState("");

  const logs = [
    {
      id: "1",
      actor: "Super Admin",
      action: "CREATE_SCHEDULE",
      entity: "Schedule (12 IPA 1)",
      time: "28 Juli 2026, 15:42 WIB",
      ip: "192.168.1.10",
    },
    {
      id: "2",
      actor: "Super Admin",
      action: "PUBLISH_ANNOUNCEMENT",
      entity: "Announcement (Tryout SNBT)",
      time: "28 Juli 2026, 14:15 WIB",
      ip: "192.168.1.10",
    },
    {
      id: "3",
      actor: "Super Admin",
      action: "UPDATE_BRANCH",
      entity: "Branch (KE-JKT-01)",
      time: "28 Juli 2026, 11:30 WIB",
      ip: "192.168.1.10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Log Aktivitas & Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Riwayat perubahan data dan tindakan administratif pada sistem.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari log..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {logs.map((l) => (
          <Card key={l.id} className="border-border/80 hover:border-primary/40 transition-all">
            <CardContent className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{l.action}</div>
                  <div className="text-muted-foreground mt-0.5">{l.entity} • Aktor: {l.actor}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-muted-foreground">{l.time}</div>
                <div className="text-[10px] text-muted-foreground">IP: {l.ip}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
