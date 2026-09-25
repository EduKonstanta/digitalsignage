"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Radio,
  Link2,
  Trash2,
  LoaderCircle,
  Tv,
  X,
  Save,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";

interface ScreenRecord {
  id: string;
  deviceId: string;
  name: string;
  status: string;
  resolution: string;
  lastSeenAt: string | null;
  branch: { name: string } | null;
  room: { name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  branchId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message?: string };
}

interface CreatedScreen {
  id: string;
  name: string;
  deviceId: string;
}

/** Alamat yang dibuka di browser TV; parameter screen memilih layar terdaftar. */
function displayUrl(deviceId: string) {
  return `${window.location.origin}/display?screen=${encodeURIComponent(deviceId)}`;
}

function formatLastSeen(value: string | null) {
  if (!value) return "Belum pernah";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes}m yang lalu`;
  const hours = Math.floor(minutes / 60);
  return `${hours}j yang lalu`;
}

export default function ScreensPage() {
  const [search, setSearch] = useState("");
  const [screens, setScreens] = useState<ScreenRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tambah Layar (modal)
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedScreen | null>(null);

  // Panduan memasang layar (modal).
  const [showGuideModal, setShowGuideModal] = useState(false);

  async function loadScreens() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/screens", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<ScreenRecord[]>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal memuat data layar.");
      }
      setScreens(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat data layar.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadScreens();
  }, []);

  function openAddModal() {
    setShowAddModal(true);
    setAddError(null);
    setCreated(null);
    setName("");
    setBranchId("");
    setRoomId("");
    setResolution("1920x1080");
    setOrientation("LANDSCAPE");
    if (branches.length === 0) {
      void (async () => {
        const [branchRes, roomRes] = await Promise.all([
          fetch("/api/v1/branches", { cache: "no-store" }),
          fetch("/api/v1/rooms", { cache: "no-store" }),
        ]);
        const branchBody = (await branchRes.json()) as ApiResponse<Branch[]>;
        const roomBody = (await roomRes.json()) as ApiResponse<Room[]>;
        if (branchBody.success) setBranches(branchBody.data);
        if (roomBody.success) setRooms(roomBody.data);
      })();
    }
  }

  function closeAddModal() {
    setShowAddModal(false);
    setCreated(null);
    void loadScreens();
  }

  async function handleAddSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const response = await fetch("/api/v1/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          branchId,
          roomId: roomId || undefined,
          resolution,
          orientation,
        }),
      });
      const body = (await response.json()) as ApiResponse<CreatedScreen>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal mendaftarkan layar.");
      }
      setCreated(body.data);
    } catch (submitError) {
      setAddError(submitError instanceof Error ? submitError.message : "Gagal mendaftarkan layar.");
    } finally {
      setAddLoading(false);
    }
  }

  function openGuideModal() {
    setShowGuideModal(true);
  }

  function closeGuideModal() {
    setShowGuideModal(false);
  }

  async function handleDelete(screen: ScreenRecord) {
    if (!window.confirm(`Hapus layar "${screen.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(screen.id);
    try {
      const response = await fetch(`/api/v1/screens/${screen.id}`, { method: "DELETE" });
      const body = (await response.json()) as { success: boolean; error?: { message?: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menghapus layar.");
      }
      setScreens((current) => current.filter((item) => item.id !== screen.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus layar.");
    } finally {
      setDeletingId(null);
    }
  }

  async function copyDisplayUrl(id: string, deviceId: string) {
    try {
      await navigator.clipboard.writeText(displayUrl(deviceId));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } catch {
      setError("Gagal menyalin alamat. Salin manual dari kolom alamat.");
    }
  }

  const roomsForBranch = rooms.filter((r) => r.branchId === branchId);

  const query = search.trim().toLocaleLowerCase("id-ID");
  const filtered = query
    ? screens.filter((s) =>
        [s.name, s.branch?.name ?? "", s.room?.name ?? ""].join(" ").toLocaleLowerCase("id-ID").includes(query),
      )
    : screens;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Layar TV</h1>
          <p className="text-sm text-muted-foreground">Status koneksi, alamat display, dan penugasan playlist TV display.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={openGuideModal}>
            <Link2 className="h-4 w-4" /> Cara Pasang Layar
          </Button>
          <Button size="sm" className="gap-2" onClick={openAddModal}>
            <Tv className="h-4 w-4" /> Tambah Layar TV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari layar..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error && screens.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadScreens()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Tv className="h-6 w-6" />}
          title={screens.length ? "Layar tidak ditemukan" : "Belum ada layar terdaftar"}
          description={
            screens.length
              ? "Ubah kata pencarian untuk melihat layar lainnya."
              : "Klik \"Tambah Layar TV\" untuk mendaftarkan layar pertama."
          }
          actionLabel={screens.length ? undefined : "Tambah Layar TV"}
          onAction={screens.length ? undefined : openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="border-border/80 hover:border-primary/40 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={s.status === "ONLINE" ? "success" : "outline"} className="text-[10px]">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" /> {s.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{s.resolution}</span>
                </div>
                <CardTitle className="text-base font-bold mt-2">{s.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {s.room?.name ?? s.branch?.name ?? "Belum ditempatkan"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
                <div className="pt-2 border-t border-border/60 flex justify-between items-center">
                  <span>Last Seen:</span>
                  <span className="font-mono text-foreground">{formatLastSeen(s.lastSeenAt)}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-1.5"
                  onClick={() => void copyDisplayUrl(s.id, s.deviceId)}
                >
                  {copiedId === s.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === s.id ? "Alamat Tersalin" : "Salin Alamat Display"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full mt-2 gap-1.5"
                  disabled={deletingId === s.id}
                  onClick={() => void handleDelete(s)}
                >
                  {deletingId === s.id ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Hapus
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Tambah Layar TV */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 my-8">
            {created ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Layar &ldquo;{created.name}&rdquo; Terdaftar</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Buka alamat di bawah ini di browser perangkat TV. Notifikasi presensi siswa
                    langsung tampil di layar.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-4">
                  <span className="break-all font-mono text-sm font-bold text-primary">
                    {displayUrl(created.deviceId)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(displayUrl(created.deviceId))}
                    aria-label="Salin alamat"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="w-full" onClick={closeAddModal}>
                  Selesai
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Tambah Layar TV Baru</h2>
                    <p className="text-xs text-muted-foreground">Daftarkan peranti TV Kiosk di area lobi atau koridor cabang.</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {addError ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {addError}
                  </div>
                ) : null}

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Nama TV / Lokasi Layar</label>
                    <Input
                      placeholder="Contoh: TV Kiosk Lobi Utama Lt 1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Cabang</label>
                      <select
                        value={branchId}
                        onChange={(e) => {
                          setBranchId(e.target.value);
                          setRoomId("");
                        }}
                        required
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="" disabled>
                          Pilih cabang
                        </option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Ruangan (opsional)</label>
                      <select
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        disabled={!branchId}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                      >
                        <option value="">Tidak terikat ruangan tertentu</option>
                        {roomsForBranch.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Resolusi</label>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="1920x1080">1920x1080 (Full HD)</option>
                        <option value="3840x2160">3840x2160 (4K)</option>
                        <option value="1280x720">1280x720 (HD)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Orientasi</label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as "LANDSCAPE" | "PORTRAIT")}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="LANDSCAPE">Landscape</option>
                        <option value="PORTRAIT">Portrait</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={addLoading} className="gap-2">
                      <Save className="h-4 w-4" /> {addLoading ? "Mendaftarkan..." : "Daftarkan Perangkat"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal: Panduan pasang layar */}
      {showGuideModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Cara Memasang Layar TV</h2>
                  <p className="text-[11px] text-muted-foreground">Cukup buka alamat di browser TV.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeGuideModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ol className="space-y-3 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
                <span>
                  Klik <strong className="text-foreground">Tambah Layar TV</strong> di halaman ini, lalu
                  isi nama, cabang, dan ruangan.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                <span>
                  Klik <strong className="text-foreground">Salin Alamat Display</strong> pada kartu layar
                  tersebut. Alamatnya berbentuk <code className="font-mono text-foreground">/display?screen=SCR-…</code>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
                <span>
                  Buka alamat itu di browser TV, lalu klik{" "}
                  <strong className="text-foreground">Aktifkan Audio</strong> satu kali.
                </span>
              </li>
            </ol>

            <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-200">
              Notifikasi tap kartu siswa tampil di semua layar yang membuka /display. Parameter{" "}
              <code className="font-mono">?screen=</code> hanya menentukan nama, cabang, jadwal, dan
              playlist layar itu, dan membuat statusnya tampil ONLINE di sini.
            </div>

            <Button className="w-full" onClick={closeGuideModal}>
              Mengerti
            </Button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
