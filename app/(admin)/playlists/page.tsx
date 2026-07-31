"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ListOrdered,
  LoaderCircle,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  CrudFormValues,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlaylistItem {
  id: string;
  contentType: string;
  contentId: string;
  sequence: number;
  durationSeconds: number;
  transition: string;
  isEnabled: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  version: number;
  items: PlaylistItem[];
  _count: { items: number; screens: number };
}

interface PlaylistForm extends CrudFormValues {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
}

interface CatalogItem {
  id: string;
  label: string;
}

const initialValues: PlaylistForm = {
  name: "",
  description: "",
  priority: 1,
  isActive: true,
};

const CONTENT_TYPES = [
  ["SCHEDULE_LAYOUT", "Papan Jadwal"],
  ["ANNOUNCEMENT", "Pengumuman"],
  ["MEDIA", "Media"],
  ["COUNTDOWN", "Countdown"],
  ["WELCOME", "Layar Selamat Datang"],
  ["EXAMINATION", "Informasi Ujian"],
] as const;

const BUILT_INS: Record<string, CatalogItem[]> = {
  SCHEDULE_LAYOUT: [{ id: "live-schedule", label: "Papan Jadwal Real-time" }],
  COUNTDOWN: [{ id: "default-countdown", label: "Countdown Standar" }],
  WELCOME: [{ id: "default-welcome", label: "Sapaan Selamat Datang" }],
  EXAMINATION: [{ id: "default-examination", label: "Informasi Ujian Standar" }],
};

export default function PlaylistsPage() {
  const [editor, setEditor] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [announcements, setAnnouncements] = useState<CatalogItem[]>([]);
  const [media, setMedia] = useState<CatalogItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [announcementResponse, mediaResponse] = await Promise.all([
          fetch("/api/v1/announcements", { cache: "no-store" }),
          fetch("/api/v1/media", { cache: "no-store" }),
        ]);
        const [announcementBody, mediaBody] = await Promise.all([
          announcementResponse.json(),
          mediaResponse.json(),
        ]);
        if (announcementBody.success) {
          setAnnouncements(
            announcementBody.data.map((item: { id: string; title: string }) => ({
              id: item.id,
              label: item.title,
            })),
          );
        }
        if (mediaBody.success) {
          setMedia(
            mediaBody.data.map((item: { id: string; name: string }) => ({
              id: item.id,
              label: item.name,
            })),
          );
        }
      } catch {
        // Editor tetap dapat digunakan untuk layout bawaan.
      }
    }
    void loadCatalogs();
  }, [refreshKey]);

  function contentOptions(type: string) {
    if (type === "ANNOUNCEMENT") return announcements;
    if (type === "MEDIA") return media;
    return BUILT_INS[type] ?? [];
  }

  function openEditor(playlist: Playlist) {
    setEditor(playlist);
    setItems(playlist.items.map((item) => ({ ...item })));
    setEditorError(null);
  }

  function addItem() {
    const contentType = "SCHEDULE_LAYOUT";
    setItems((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        contentType,
        contentId: BUILT_INS[contentType][0].id,
        sequence: current.length + 1,
        durationSeconds: 30,
        transition: "fade",
        isEnabled: true,
      },
    ]);
  }

  function updateItem(index: number, patch: Partial<PlaylistItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveItems() {
    if (!editor) return;
    if (items.some((item) => !item.contentId)) {
      setEditorError("Semua item playlist harus memiliki konten.");
      return;
    }
    setIsSavingItems(true);
    setEditorError(null);
    try {
      const response = await fetch(`/api/v1/playlists/${editor.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            contentType: item.contentType,
            contentId: item.contentId,
            durationSeconds: Number(item.durationSeconds),
            transition: item.transition,
            isEnabled: item.isEnabled,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal menyimpan urutan playlist.");
      }
      setEditor(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "Gagal menyimpan urutan playlist.");
    } finally {
      setIsSavingItems(false);
    }
  }

  return (
    <>
      <MasterCrudPage<Playlist, PlaylistForm>
        title="Playlist Signage"
        description="Kelola playlist dan susun urutan pengumuman, media, serta layout yang diputar di TV."
        entityLabel="Playlist"
        endpoint="/api/v1/playlists"
        refreshKey={refreshKey}
        initialValues={initialValues}
        fields={[
          { name: "name", label: "Nama playlist", required: true, placeholder: "Contoh: Playlist Lobby Utama" },
          { name: "priority", label: "Prioritas (1–10)", type: "number", min: 1, required: true },
          { name: "description", label: "Deskripsi", type: "textarea", fullWidth: true },
          { name: "isActive", label: "Playlist aktif", type: "checkbox", fullWidth: true },
        ]}
        columns={[
          {
            header: "Playlist",
            render: (item) => (
              <div className="max-w-sm">
                <p className="font-semibold">{item.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description || "Tanpa deskripsi"}</p>
              </div>
            ),
          },
          {
            header: "Rotasi",
            render: (item) => (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {item._count.items} item · v{item.version}
              </span>
            ),
          },
          {
            header: "Layar",
            render: (item) => <span className="text-xs">{item._count.screens} TV</span>,
          },
          {
            header: "Status",
            render: (item) => (
              <Badge variant={item.isActive ? "success" : "secondary"}>
                {item.isActive ? "AKTIF" : "NONAKTIF"}
              </Badge>
            ),
          },
        ]}
        toFormValues={(item) => ({
          name: item.name,
          description: item.description ?? "",
          priority: item.priority,
          isActive: item.isActive,
        })}
        toPayload={(form) => ({
          name: form.name,
          description: form.description || undefined,
          priority: Number(form.priority),
          isActive: Boolean(form.isActive),
        })}
        getSearchText={(item) => `${item.name} ${item.description ?? ""}`}
        getRecordLabel={(item) => item.name}
        emptyIcon={<ListOrdered className="h-7 w-7" />}
        renderExtraActions={(item) => (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openEditor(item)}>
            <Settings2 className="h-3.5 w-3.5" /> Atur Rotasi
          </Button>
        )}
      />

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Atur Rotasi: {editor.name}</h2>
                <p className="text-xs text-muted-foreground">Urutan teratas akan diputar lebih dahulu.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const options = contentOptions(item.contentType);
                return (
                  <div key={item.id} className="grid gap-3 rounded-lg border border-border/70 bg-background/40 p-3 md:grid-cols-[44px_1fr_1.5fr_110px_120px_auto] md:items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <select
                      value={item.contentType}
                      onChange={(event) => {
                        const contentType = event.target.value;
                        const nextOptions = contentOptions(contentType);
                        updateItem(index, { contentType, contentId: nextOptions[0]?.id ?? "" });
                      }}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {CONTENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <select
                      value={item.contentId}
                      onChange={(event) => updateItem(index, { contentId: event.target.value })}
                      className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Pilih konten</option>
                      {!options.some((option) => option.id === item.contentId) && item.contentId ? (
                        <option value={item.contentId}>{item.contentId}</option>
                      ) : null}
                      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <Input
                      type="number"
                      min={3}
                      value={item.durationSeconds}
                      onChange={(event) => updateItem(index, { durationSeconds: Number(event.target.value) })}
                      title="Durasi dalam detik"
                    />
                    <select
                      value={item.transition}
                      onChange={(event) => updateItem(index, { transition: event.target.value })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                      <option value="none">Tanpa transisi</option>
                    </select>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <label className="col-span-full flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={item.isEnabled} onChange={(event) => updateItem(index, { isEnabled: event.target.checked })} className="accent-blue-500" />
                      Item aktif dalam rotasi · durasi {item.durationSeconds} detik
                    </label>
                  </div>
                );
              })}
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada item dalam playlist.
              </div>
            ) : null}

            {editorError ? (
              <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {editorError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" className="gap-2" onClick={addItem}>
                <Plus className="h-4 w-4" /> Tambah Item
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditor(null)}>Batal</Button>
                <Button onClick={() => void saveItems()} disabled={isSavingItems} className="gap-2">
                  {isSavingItems ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
                  Simpan Urutan
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
