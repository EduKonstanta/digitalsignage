"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Monitor, Shield, Bell, Image } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [appName, setAppName] = useState("Konstanta Education Digital Signage");
  const [branchName, setBranchName] = useState("Konstanta Cabang Utama Jakarta");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Sistem & Branding</h1>
        <p className="text-sm text-muted-foreground">
          Atur nama cabang, logo lembaga, tema warna display TV, dan konfigurasi umum.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
          Pengaturan berhasil disimpan!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" /> Profil Cabang & Display TV
            </CardTitle>
            <CardDescription>Nama cabang dan identitas yang akan tayang pada header TV Kiosk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Judul Aplikasi Signage</label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Nama Cabang Utama</label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" /> Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
