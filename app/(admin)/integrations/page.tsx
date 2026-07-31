"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sheet, RefreshCw, CheckCircle, Database, FileSpreadsheet, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function IntegrationsPage() {
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("28 Juli 2026, 18:15 WIB");

  const handleSyncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toLocaleString("id-ID"));
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrasi Google Sheets & Data Master</h1>
        <p className="text-sm text-muted-foreground">
          Hubungkan Google Spreadsheet operasional cabang untuk melakukan impor dan sinkronisasi jadwal otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Sheets Sync Card */}
        <Card className="md:col-span-2 bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" /> Google Sheets Auto-Sync
              </CardTitle>
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Terhubung
              </Badge>
            </div>
            <CardDescription>
              Jadwal les, daftar tutor, dan ruangan disinkronkan secara berkala dari spreadsheet cabang.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">URL Google Spreadsheet</label>
              <div className="flex gap-2">
                <Input
                  className="font-mono text-xs"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Terakhir Disinkronkan</span>
                <span className="text-sm font-semibold text-foreground">{lastSync}</span>
              </div>
              <Button onClick={handleSyncNow} disabled={syncing} size="sm" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Menyinkronkan..." : "Sync Sekarang"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Pengaturan Interval</CardTitle>
            <CardDescription>Frekuensi pengambilan data otomatis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground">Interval Sync Otomatis</span>
              <p className="text-sm font-semibold text-foreground">Setiap 15 Menit</p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground">Penanganan Bentrok</span>
              <p className="text-sm font-semibold text-foreground">Tolak & Notifikasi Admin</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
