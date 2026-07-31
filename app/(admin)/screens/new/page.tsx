"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Tv, QrCode } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewScreenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/screens");
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/screens">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Registrasi Layar Display TV Baru</h1>
            <p className="text-sm text-muted-foreground">Daftarkan peranti TV Kiosk di area lobi atau koridor cabang.</p>
          </div>
        </div>
        <Link href="/screens/pairing">
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" /> Pairing Kode 6-Digit
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tv className="h-4 w-4 text-primary" /> Informasi Perangkat TV
          </CardTitle>
          <CardDescription>Nama lokasi dan orientasi layar TV.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Nama TV / Lokasi Layar</label>
              <Input
                placeholder="Contoh: TV Kiosk Lobi Utama Lt 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Link href="/screens">
                <Button variant="ghost">Batal</Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" /> {loading ? "Mendaftarkan..." : "Daftarkan Perangkat"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
