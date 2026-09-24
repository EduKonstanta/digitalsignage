"use client";

import { useEffect, useState } from "react";
import { CalendarClock, LoaderCircle, MoonStar, Monitor, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [appName, setAppName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [prayerCity, setPrayerCity] = useState("Jakarta");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/v1/settings", { cache: "no-store" });
        const body = await response.json();
        if (response.ok && body.success) {
          setAppName(body.data.appName ?? "Konstanta Education Digital Signage");
          setBranchName(body.data.branchName ?? "Konstanta Cabang Utama Jakarta");
          setEventLabel(body.data.eventLabel ?? "");
          setEventDate(body.data.eventDate ?? "");
          setPrayerCity(body.data.prayerCity || "Jakarta");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, branchName, eventLabel, eventDate, prayerCity }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menyimpan pengaturan.");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Sistem & Branding</h1>
        <p className="text-sm text-muted-foreground">
          Atur nama cabang, logo lembaga, tema warna display TV, dan konfigurasi umum.
        </p>
      </div>

      {success ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
          Pengaturan berhasil disimpan!
        </div>
      ) : null}

      {error ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> Profil Cabang & Display TV
              </CardTitle>
              <CardDescription>
                Nama cabang dan identitas yang akan tayang pada header TV Kiosk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Judul Aplikasi Signage</label>
                <Input value={appName} onChange={(event) => setAppName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Nama Cabang Utama</label>
                <Input value={branchName} onChange={(event) => setBranchName(event.target.value)} required />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" /> Widget Informasi Layar TV
              </CardTitle>
              <CardDescription>
                Countdown tanggal penting dan jadwal sholat yang tampil di layar TV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> Nama Acara / Ujian
                  </label>
                  <Input
                    value={eventLabel}
                    onChange={(event) => setEventLabel(event.target.value)}
                    placeholder="Contoh: Ujian TKA"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> Tanggal Acara
                  </label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Kosongkan keduanya untuk otomatis pakai &ldquo;UTBK&rdquo; tanggal 21 April tahun berjalan (atau tahun depan jika sudah lewat). Isi bebas untuk acara lain, misal &ldquo;Ujian TKA&rdquo; 26 Oktober 2026.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MoonStar className="h-3.5 w-3.5" /> Kota Jadwal Sholat
                </label>
                <Input
                  value={prayerCity}
                  onChange={(event) => setPrayerCity(event.target.value)}
                  placeholder="Jakarta"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Nama kota sesuai data Aladhan.com, contoh: Jakarta, Bandung, Surabaya.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="gap-2" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
