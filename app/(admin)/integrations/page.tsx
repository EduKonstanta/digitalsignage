"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOCKED_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/11bzGZTSG8clR1WQ4E__ULUUnC-eMMeDDnap8mA-qmnw/edit?gid=0#gid=0";

type SyncIssue = { sheet: string; row: number; key: string; reason: string };

type LiveDataCounts = {
  branches: number;
  rooms: number;
  tutors: number;
  programs: number;
  classes: number;
  subjects: number;
  schedules: number;
};

type LocalOverrides = {
  created: number;
  updated: number;
  deleted: number;
  total: number;
};

type LiveDataStatus = {
  configured: boolean;
  serviceAccountEmail: string | null;
  fetchedAt: string;
  counts: LiveDataCounts;
  issues: SyncIssue[];
  overrides?: LocalOverrides;
};

export default function IntegrationsPage() {
  const [status, setStatus] = useState<LiveDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [confirmResync, setConfirmResync] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/google-sheets", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Gagal memuat status Google Sheets");
      }
      setStatus(payload.data);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Gagal memuat status Google Sheets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleReloadNow = async () => {
    setReloading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/google-sheets", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Gagal memuat ulang data");
      }

      const nextStatus = payload.data as LiveDataStatus;
      const processed = Object.values(nextStatus.counts).reduce((total, count) => total + count, 0);
      setStatus(nextStatus);
      setMessage(`${processed} data dimuat; ${nextStatus.issues.length} baris ditahan untuk diperiksa.`);
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : "Gagal memuat ulang data");
    } finally {
      setReloading(false);
    }
  };


  const handleResync = async () => {
    setResyncing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/google-sheets", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Gagal menyinkronkan ulang");
      }

      const nextStatus = payload.data as LiveDataStatus & { removed?: LocalOverrides };
      setStatus(nextStatus);
      setConfirmResync(false);
      setMessage(
        `Sinkronisasi ulang selesai. ${nextStatus.removed?.total ?? 0} perubahan lokal dibuang, data kini mengikuti Google Sheet.`,
      );
    } catch (resyncError) {
      setError(resyncError instanceof Error ? resyncError.message : "Gagal menyinkronkan ulang");
    } finally {
      setResyncing(false);
    }
  };

  const lastLoadedLabel = status?.fetchedAt
    ? new Date(status.fetchedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    : "Belum pernah";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Integrasi Google Sheets & Data Master
        </h1>
        <p className="text-sm text-muted-foreground">
          Satu sumber data terkunci untuk cabang, ruangan, tutor, program, kelas, mata pelajaran, dan jadwal.
        </p>
      </div>

      {error ? (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" /> Google Sheets — Sumber Data Live
              </CardTitle>
              <Badge variant={status?.configured ? "success" : "secondary"} className="gap-1">
                {status?.configured ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {loading ? "Memeriksa..." : status?.configured ? "Terhubung" : "Perlu Service Account"}
              </Badge>
            </div>
            <CardDescription>
              Data master dibaca langsung dari Sheet setiap permintaan, jadwal diperiksa terhadap bentrok tutor dan ruangan.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5" /> URL Google Spreadsheet Terkunci
              </label>
              <div className="flex gap-2">
                <Input className="font-mono text-xs bg-muted/30" value={LOCKED_SHEET_URL} readOnly aria-readonly="true" />
                <a href={LOCKED_SHEET_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="shrink-0" title="Buka Google Sheet">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Link ditetapkan oleh sistem dan tidak dapat ditambah, diubah, atau dihapus dari dashboard.
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Terakhir Dimuat
                </span>
                <span className="text-sm font-semibold text-foreground">{lastLoadedLabel}</span>
              </div>
              <Button
                onClick={handleReloadNow}
                disabled={reloading || loading}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
                {reloading ? "Memuat Ulang..." : "Muat Ulang"}
              </Button>
            </div>

            {message ? <p className="text-xs text-emerald-500">{message}</p> : null}

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Perubahan Lokal di Dashboard
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-md leading-relaxed">
                    Data yang ditambah, diubah, atau dihapus lewat form admin menimpa isi Google
                    Sheet. Sinkronisasi ulang membuang semua perubahan itu agar Sheet kembali
                    menjadi acuan tunggal.
                  </p>
                  {status?.overrides ? (
                    <p className="text-xs font-semibold text-foreground mt-2">
                      {status.overrides.total} perubahan aktif — {status.overrides.created} tambah ·{" "}
                      {status.overrides.updated} ubah · {status.overrides.deleted} hapus
                    </p>
                  ) : null}
                </div>

                {confirmResync ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={handleResync}
                      disabled={resyncing}
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${resyncing ? "animate-spin" : ""}`} />
                      {resyncing ? "Menyinkronkan..." : "Ya, Buang & Sinkronkan"}
                    </Button>
                    <Button
                      onClick={() => setConfirmResync(false)}
                      disabled={resyncing}
                      size="sm"
                      variant="outline"
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmResync(true)}
                    disabled={loading || !status?.overrides?.total}
                    size="sm"
                    variant="outline"
                    className="gap-2 shrink-0"
                  >
                    <RefreshCw className="h-4 w-4" /> Sinkronisasi Ulang dari Sheet
                  </Button>
                )}
              </div>

              {confirmResync ? (
                <p className="text-[11px] font-semibold text-rose-300">
                  Tindakan ini menghapus {status?.overrides?.total ?? 0} perubahan lokal secara
                  permanen dan tidak dapat dibatalkan.
                </p>
              ) : null}
            </div>

            {status?.issues.length ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {status.issues.length} baris ditahan dari Sheet
                </span>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-500/20 bg-amber-500/5 divide-y divide-amber-500/10">
                  {status.issues.slice(0, 20).map((issue, index) => (
                    <p key={`${issue.sheet}-${issue.row}-${index}`} className="px-3 py-1.5 text-[11px] text-amber-500">
                      {issue.sheet} baris {issue.row} ({issue.key || "-"}): {issue.reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Pengaturan Sumber Data</CardTitle>
            <CardDescription>Konfigurasi tetap untuk sumber akademik utama.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground">Mode Pembaruan</span>
              <p className="text-sm font-bold text-foreground">Live (cache singkat ~20 detik)</p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground">Urutan Data</span>
              <p className="text-xs font-semibold text-foreground leading-relaxed">
                Cabang → Program → Kelas → Ruangan → Tutor → Mata Pelajaran → Jadwal
              </p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground">Penanganan Bentrok</span>
              <p className="text-sm font-bold text-foreground">Tolak & Catat Baris</p>
            </div>
            {status?.counts ? (
              <div className="p-3 bg-muted/20 rounded-lg space-y-1">
                <span className="text-xs text-muted-foreground">Jumlah Data Termuat</span>
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {status.counts.branches} cabang · {status.counts.rooms} ruangan · {status.counts.tutors} tutor ·{" "}
                  {status.counts.programs} program · {status.counts.classes} kelas · {status.counts.subjects} mapel ·{" "}
                  {status.counts.schedules} jadwal
                </p>
              </div>
            ) : null}
            {status?.serviceAccountEmail ? (
              <div className="p-3 bg-muted/20 rounded-lg space-y-1">
                <span className="text-xs text-muted-foreground">Service Account</span>
                <p className="text-[11px] font-mono text-foreground break-all">{status.serviceAccountEmail}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
