"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, ShieldAlert, Volume2, AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Severity = "INFO" | "WARNING" | "CRITICAL";

interface EmergencyBroadcast {
  id: string;
  title: string;
  instruction: string;
  severity: Severity;
  voiceEnabled: boolean;
  endedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message?: string };
}

const DEFAULT_TITLE = "EVAKUASI DARURAT — HARAP KELUAR RUANGAN";
const DEFAULT_INSTRUCTION =
  "Harap seluruh siswa dan staf tetap tenang dan berjalan menuju titik kumpul di lapangan depan.";

export default function EmergencyPage() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [severity, setSeverity] = useState<Severity>("CRITICAL");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [active, setActive] = useState<EmergencyBroadcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadActive() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/emergency", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<EmergencyBroadcast | null>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? `Permintaan gagal (${response.status}).`);
      }
      setActive(body.data);
      setError(null);
      if (body.data) {
        setTitle(body.data.title);
        setInstruction(body.data.instruction);
        setSeverity(body.data.severity);
        setVoiceEnabled(body.data.voiceEnabled);
      }
    } catch (loadError) {
      // Halaman darurat tidak boleh tampak "aman" saat statusnya gagal dimuat.
      setError(
        loadError instanceof Error
          ? `Gagal memuat status darurat: ${loadError.message}`
          : "Gagal memuat status darurat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActive();
  }, []);

  async function handleTriggerBroadcast() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, instruction, severity, voiceEnabled }),
      });
      const body = (await response.json()) as ApiResponse<EmergencyBroadcast>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal mengirimkan emergency broadcast.");
      }
      setActive(body.data);
      setIsConfirming(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirimkan emergency broadcast.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStopBroadcast() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/emergency", { method: "PATCH" });
      const body = (await response.json()) as ApiResponse<EmergencyBroadcast>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menghentikan emergency broadcast.");
      }
      setActive(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menghentikan emergency broadcast.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBroadcasting = Boolean(active);

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

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>
      )}

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
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
                    disabled={isBroadcasting}
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
                disabled={isBroadcasting}
                className="font-bold text-rose-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Instruksi Detail</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={isBroadcasting}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>

            <label className="flex w-fit items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2">
              <input
                type="checkbox"
                checked={voiceEnabled}
                disabled={isBroadcasting}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="h-4 w-4 accent-rose-500"
              />
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Sertakan suara peringatan (voice)</span>
            </label>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            {isBroadcasting ? (
              <Button
                onClick={() => void handleStopBroadcast()}
                disabled={isSubmitting}
                variant="outline"
                className="w-full text-emerald-400 border-emerald-500/40"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Hentikan Emergency Broadcast & Kembalikan Layar
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
      )}

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
              <Button onClick={() => setIsConfirming(false)} variant="outline" className="flex-1" disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={() => void handleTriggerBroadcast()} variant="emergency" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin" /> : null}
                Ya, Siarkan Sekarang!
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
