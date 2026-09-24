"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Dicek di sini supaya salah ketik ketahuan sebelum jaringan tersentuh.
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama dengan password baru.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: { revokedSessions: number };
        error?: { message?: string };
      };

      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal mengganti password.");
      }

      const revoked = body.data?.revokedSessions ?? 0;
      setSuccessMessage(
        revoked > 0
          ? `Password berhasil diganti. ${revoked} sesi login lain ikut dikeluarkan.`
          : "Password berhasil diganti.",
      );
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal mengganti password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Keamanan Akun</h2>
        <p className="text-sm text-muted-foreground">
          Ganti password login admin. Lakukan ini segera bila akun masih memakai password bawaan.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Ganti Password
          </CardTitle>
          <CardDescription>
            Minimal {MIN_PASSWORD_LENGTH} karakter, dan tidak boleh password yang umum dipakai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Password saat ini</span>
              <Input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Password baru</span>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Ulangi password baru
              </span>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPasswords ? "Sembunyikan password" : "Tampilkan password"}
            </button>

            <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
              Setelah password diganti, semua perangkat lain yang sedang login akan dikeluarkan.
              Perangkat yang kamu pakai sekarang tetap masuk.
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {isSaving ? "Menyimpan..." : "Ganti Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
