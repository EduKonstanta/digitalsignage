"use client";

import React, { useState } from "react";
import { QrCode, Tv, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PairingPage() {
  const [pairingCode, setPairingCode] = useState("");
  const [screenName, setScreenName] = useState("");
  const [paired, setPaired] = useState(false);

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    setPaired(true);
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <Card className="border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Pairing Perangkat Display</CardTitle>
          <CardDescription className="text-xs">
            Masukkan 6-digit kode pairing yang tampil pada layar TV untuk menghubungkannya ke sistem.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {paired ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-foreground">Perangkat Berhasil Dipasangkan!</h3>
              <p className="text-xs text-muted-foreground">
                Layar {screenName} kini online dan siap menerima playlist serta update real-time.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePair} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Kode Pairing (6-Digit)</label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="KODE6"
                  className="font-mono text-center text-lg tracking-widest uppercase font-bold"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nama Layar (Contoh: TV Lobby Utama)</label>
                <Input
                  type="text"
                  placeholder="TV Lobby Utama"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Hubungkan Layar Display
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
