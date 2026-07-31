"use client";

import React, { useState } from "react";
import { AlertOctagon, ShieldAlert, Radio, Volume2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function EmergencyPage() {
  const [title, setTitle] = useState("EVAKUASI DARURAT — HARAP KELUAR RUANGAN");
  const [instruction, setInstruction] = useState("Harap seluruh siswa dan staf tetap tenang dan berjalan menuju titik kumpul di lapangan depan.");
  const [severity, setSeverity] = useState<"INFO" | "WARNING" | "CRITICAL">("CRITICAL");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleTriggerBroadcast = () => {
    setIsBroadcasting(true);
    setIsConfirming(false);
  };

  const handleStopBroadcast = () => {
    setIsBroadcasting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-rose-500 flex items-center gap-2">
            <AlertOctagon className="h-6 w-6" /> Emergency Broadcast Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Pengambilalihan (takeover) tampilan seluruh TV display untuk pengumuman darurat.
          </p>
        </div>
        {isBroadcasting && (
          <Badge variant="destructive" className="animate-pulse text-xs px-3 py-1 font-bold">
            BROADCAST DARURAT AKTIF
          </Badge>
        )}
      </div>

      <Card className="border-rose-500/30 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Konfigurasi Pesan Darurat</CardTitle>
          <CardDescription>Pesan ini akan mengambil alih 100% layar display secara langsung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Tingkat Bahaya (Severity)</label>
            <div className="flex gap-2">
              {(["INFO", "WARNING", "CRITICAL"] as const).map((sev) => (
                <Button
                  key={sev}
                  type="button"
                  variant={severity === sev ? "emergency" : "outline"}
                  size="sm"
                  onClick={() => setSeverity(sev)}
                >
                  {sev}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Judul Pesan</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-bold text-rose-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Instruksi Detail</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border/60 pt-4">
          {isBroadcasting ? (
            <Button onClick={handleStopBroadcast} variant="outline" className="w-full text-emerald-400 border-emerald-500/40">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Hentikan Emergency Broadcast & Kembalikan Layar
            </Button>
          ) : (
            <Button
              onClick={() => setIsConfirming(true)}
              variant="emergency"
              className="w-full text-base py-6"
            >
              <ShieldAlert className="h-5 w-5 mr-2" /> AKTIFKAN EMERGENCY BROADCAST (TAKEOVER)
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-rose-500 bg-slate-950 text-white">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto animate-bounce" />
              <CardTitle className="text-xl font-bold text-rose-400">Konfirmasi Siaran Darurat</CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Apakah Anda yakin ingin mempublikasikan pesan darurat ini ke seluruh TV display?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs">
              <div><strong className="text-rose-400">Judul:</strong> {title}</div>
              <div><strong className="text-slate-300">Instruksi:</strong> {instruction}</div>
            </CardContent>
            <CardFooter className="flex gap-2 pt-4">
              <Button onClick={() => setIsConfirming(false)} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button onClick={handleTriggerBroadcast} variant="emergency" className="flex-1">
                Ya, Siarkan Sekarang!
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
