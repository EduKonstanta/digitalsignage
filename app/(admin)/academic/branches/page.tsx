"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe,
  LoaderCircle,
  MapPin,
  Monitor,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
  _count: {
    rooms: number;
    schedules: number;
    screens: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  timezone: string;
  isActive: boolean;
}

const EMPTY_FORM: BranchForm = {
  name: "",
  code: "",
  address: "",
  timezone: "Asia/Jakarta",
  isActive: true,
};

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
];

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/branches", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<Branch[]>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal mengambil data cabang.");
      }
      setBranches(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat data cabang.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return branches;

    return branches.filter((branch) =>
      [branch.name, branch.code, branch.address ?? "", branch.timezone].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(query),
      ),
    );
  }, [branches, search]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccessMessage(null);
  }

  function openEditForm(branch: Branch) {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      timezone: branch.timezone,
      isActive: branch.isActive,
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        editingId ? `/api/v1/branches/${editingId}` : "/api/v1/branches",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            address: form.address.trim(),
          }),
        },
      );
      const body = (await response.json()) as ApiResponse<Branch>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menyimpan data cabang.");
      }

      setSuccessMessage(
        editingId
          ? `Cabang ${form.name.trim()} berhasil diperbarui.`
          : `Cabang ${form.name.trim()} berhasil ditambahkan.`,
      );
      closeForm();
      await loadBranches();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan data cabang.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(branch: Branch) {
    const confirmed = window.confirm(
      `Hapus cabang “${branch.name}”? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;

    setDeletingId(branch.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/v1/branches/${branch.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menghapus cabang.");
      }

      setSuccessMessage(`Cabang ${branch.name} berhasil dihapus.`);
      setBranches((current) => current.filter((item) => item.id !== branch.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Gagal menghapus data cabang.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kelola Cabang Operasional
          </h1>
          <p className="text-sm text-muted-foreground">
            Tambah, perbarui, dan hapus lokasi cabang operasional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={GOOGLE_SHEETS_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Buka Google Sheet
            </Button>
          </a>
          <Button size="sm" className="gap-2" onClick={showForm ? closeForm : openCreateForm}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Tutup Form" : "Tambah Cabang"}
          </Button>
        </div>
      </div>

      {showForm ? (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {editingId ? "Edit Cabang" : "Tambah Cabang Baru"}
            </CardTitle>
            <CardDescription>
              Kode cabang harus unik dan akan disimpan dalam huruf kapital.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Nama cabang
                  </span>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Contoh: Konstanta Cabang Bandung"
                    minLength={2}
                    required
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Kode cabang
                  </span>
                  <Input
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="KE-BDG-01"
                    className="font-mono uppercase"
                    minLength={2}
                    required
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Alamat</span>
                  <Input
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="Alamat lengkap cabang"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Zona waktu</span>
                  <select
                    value={form.timezone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, timezone: event.target.value }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TIMEZONES.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex w-fit items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm">Cabang aktif</span>
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Edit3 className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Simpan Perubahan" : "Tambah Cabang"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {error && !isLoading ? (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kode, alamat, atau zona waktu..."
            className="h-9 pl-9 text-xs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Memuat data cabang...</span>
        </div>
      ) : error && branches.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadBranches()} />
      ) : filteredBranches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={branches.length ? "Cabang tidak ditemukan" : "Belum ada cabang"}
          description={
            branches.length
              ? "Ubah kata pencarian untuk menemukan cabang lain."
              : "Tambahkan cabang pertama untuk mulai mengatur ruangan dan layar."
          }
          actionLabel={branches.length ? undefined : "Tambah Cabang"}
          onAction={branches.length ? undefined : openCreateForm}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBranches.map((branch) => (
            <Card
              key={branch.id}
              className="flex flex-col justify-between border-border/80 transition-all hover:border-primary/40"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {branch.code}
                  </Badge>
                  {branch.isActive ? (
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Aktif
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      <XCircle className="mr-1 h-3 w-3" /> Nonaktif
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-base font-bold">{branch.name}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{branch.address || "Alamat belum diisi"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-primary" /> {branch.timezone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3.5 w-3.5" />
                    {branch._count.rooms} Ruangan · {branch._count.screens} TV
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {branch._count.schedules} jadwal terhubung
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openEditForm(branch)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      disabled={deletingId === branch.id}
                      onClick={() => void handleDelete(branch)}
                    >
                      {deletingId === branch.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
