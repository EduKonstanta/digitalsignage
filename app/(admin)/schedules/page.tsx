"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MapPin,
  User,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface ScheduleRecord {
  id: string;
  startAt: string;
  endAt: string;
  branchId: string;
  programId: string;
  classId: string;
  subjectId: string;
  tutorId: string;
  roomId: string;
  manualStatus: string;
  computedStatus: string;
  notes?: string | null;
  branch?: { id: string; name: string };
  program?: { id: string; name: string };
  class?: { id: string; name: string };
  subject?: { id: string; name: string };
  tutor?: { id: string; name: string; displayName?: string };
  room?: { id: string; name: string };
}

interface OptionItem {
  id: string;
  name: string;
  branchId?: string;
  programId?: string;
}

const statusBadgeConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "info" | "secondary" | "destructive" }
> = {
  IN_PROGRESS: { label: "Sedang Berlangsung", variant: "success" },
  STARTING_SOON: { label: "Segera Dimulai", variant: "warning" },
  SCHEDULED: { label: "Terjadwal", variant: "info" },
  COMPLETED: { label: "Selesai", variant: "secondary" },
  CANCELLED: { label: "Batal", variant: "destructive" },
  DELAYED: { label: "Terlambat", variant: "warning" },
  MOVED_ROOM: { label: "Pindah Ruang", variant: "info" },
  ONLINE: { label: "Online", variant: "info" },
};

function formatTime(isoString: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(isoString));
  } catch {
    return "--:--";
  }
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

/**
 * Pecah satu instant menjadi tanggal & jam menurut Asia/Jakarta. Memakai
 * toISOString() (UTC) untuk tanggal tapi toTimeString() (zona browser) untuk
 * jam membuat kelas sebelum pukul 07:00 WIB tergeser satu hari saat diedit.
 */
function jakartaDateTimeParts(isoString: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoString));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = value.hour === "24" ? "00" : value.hour;
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${hour}:${value.minute}`,
  };
}

/** Rakit ISO string dari input tanggal+jam admin, selalu ditafsirkan sebagai WIB. */
function jakartaInputToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

/** Tanggal hari ini menurut WIB, untuk nilai awal form. */
function todayJakartaDate() {
  return jakartaDateTimeParts(new Date().toISOString()).date;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Options for Form
  const [branches, setBranches] = useState<OptionItem[]>([]);
  const [rooms, setRooms] = useState<OptionItem[]>([]);
  const [tutors, setTutors] = useState<OptionItem[]>([]);
  const [programs, setPrograms] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);

  // Create Modal State
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [createForm, setCreateForm] = useState({
    branchId: "",
    roomId: "",
    tutorId: "",
    programId: "",
    classId: "",
    subjectId: "",
    date: todayJakartaDate(),
    startTime: "08:00",
    endTime: "09:30",
    manualStatus: "NONE",
    notes: "",
  });
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [editForm, setEditForm] = useState({
    branchId: "",
    roomId: "",
    tutorId: "",
    programId: "",
    classId: "",
    subjectId: "",
    date: "",
    startTime: "",
    endTime: "",
    manualStatus: "NONE",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load Schedules & Options
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/schedules");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal memuat daftar jadwal");
      }
      setSchedules(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();

    // Fetch form options
    async function loadOptions() {
      try {
        const [resB, resR, resT, resP, resC, resS] = await Promise.all([
          fetch("/api/v1/branches").then((r) => r.json()),
          fetch("/api/v1/rooms").then((r) => r.json()),
          fetch("/api/v1/tutors").then((r) => r.json()),
          fetch("/api/v1/programs").then((r) => r.json()),
          fetch("/api/v1/classes").then((r) => r.json()),
          fetch("/api/v1/subjects").then((r) => r.json()),
        ]);

        if (resB.success) setBranches(resB.data);
        if (resR.success) setRooms(resR.data);
        if (resT.success) setTutors(resT.data);
        if (resP.success) setPrograms(resP.data);
        if (resC.success) setClasses(resC.data);
        if (resS.success) setSubjects(resS.data);
      } catch (err) {
        console.error("Gagal memuat opsi:", err);
      }
    }
    loadOptions();
  }, [fetchSchedules]);

  // Open Create Modal
  const openCreateModal = () => {
    setIsCreatingSchedule(true);
    setCreateError(null);
    const defaultBranchId = branches[0]?.id || "";
    const defaultProgramId = programs[0]?.id || "";
    setCreateForm({
      branchId: defaultBranchId,
      roomId: rooms.find((r) => r.branchId === defaultBranchId)?.id || "",
      tutorId: tutors[0]?.id || "",
      programId: defaultProgramId,
      classId: classes.find((c) => c.programId === defaultProgramId)?.id || "",
      subjectId: subjects[0]?.id || "",
      date: todayJakartaDate(),
      startTime: "08:00",
      endTime: "09:30",
      manualStatus: "NONE",
      notes: "",
    });
  };

  // Duplikat jadwal yang sudah ada (untuk kelas berulang tiap minggu)
  const openDuplicateModal = (sch: ScheduleRecord) => {
    setIsCreatingSchedule(true);
    setCreateError(null);
    setCreateForm({
      branchId: sch.branchId,
      roomId: sch.roomId,
      tutorId: sch.tutorId,
      programId: sch.programId,
      classId: sch.classId,
      subjectId: sch.subjectId,
      date: todayJakartaDate(),
      startTime: jakartaDateTimeParts(sch.startAt).time,
      endTime: jakartaDateTimeParts(sch.endAt).time,
      manualStatus: "NONE",
      notes: sch.notes || "",
    });
  };

  // Submit Create Form
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreate(true);
    setCreateError(null);

    try {
      const startAt = jakartaInputToIso(createForm.date, createForm.startTime);
      const endAt = jakartaInputToIso(createForm.date, createForm.endTime);

      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: createForm.branchId,
          roomId: createForm.roomId,
          tutorId: createForm.tutorId,
          programId: createForm.programId,
          classId: createForm.classId,
          subjectId: createForm.subjectId,
          startAt,
          endAt,
          manualStatus: createForm.manualStatus,
          notes: createForm.notes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal membuat jadwal baru");
      }

      setIsCreatingSchedule(false);
      await fetchSchedules();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat jadwal");
    } finally {
      setSavingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (sch: ScheduleRecord) => {
    setEditingSchedule(sch);
    setEditError(null);

    const start = jakartaDateTimeParts(sch.startAt);
    const end = jakartaDateTimeParts(sch.endAt);

    const dateStr = start.date;
    const startTimeStr = start.time;
    const endTimeStr = end.time;

    setEditForm({
      branchId: sch.branchId,
      roomId: sch.roomId,
      tutorId: sch.tutorId,
      programId: sch.programId,
      classId: sch.classId,
      subjectId: sch.subjectId,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      manualStatus: sch.manualStatus || "NONE",
      notes: sch.notes || "",
    });
  };

  // Submit Edit Form
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    setSavingEdit(true);
    setEditError(null);

    try {
      const startAt = jakartaInputToIso(editForm.date, editForm.startTime);
      const endAt = jakartaInputToIso(editForm.date, editForm.endTime);

      const res = await fetch(`/api/v1/schedules/${editingSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: editForm.branchId,
          roomId: editForm.roomId,
          tutorId: editForm.tutorId,
          programId: editForm.programId,
          classId: editForm.classId,
          subjectId: editForm.subjectId,
          startAt,
          endAt,
          manualStatus: editForm.manualStatus,
          notes: editForm.notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal memperbarui jadwal");
      }

      setEditingSchedule(null);
      await fetchSchedules();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengedit jadwal");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Schedule Handler
  const handleDelete = async () => {
    if (!deletingSchedule) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/v1/schedules/${deletingSchedule.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal menghapus jadwal");
      }

      setDeletingSchedule(null);
      await fetchSchedules();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus jadwal");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered schedules
  const filteredSchedules = schedules.filter((s) => {
    const className = s.class?.name || "";
    const subjectName = s.subject?.name || "";
    const tutorName = s.tutor?.name || s.tutor?.displayName || "";
    const matchesSearch =
      className.toLowerCase().includes(search.toLowerCase()) ||
      subjectName.toLowerCase().includes(search.toLowerCase()) ||
      tutorName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || s.computedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kelola Jadwal Kelas</h1>
          <p className="text-sm text-muted-foreground">Buat, edit, publish, dan atur jadwal les real-time pada layar display.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link href="/schedules/calendar">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Calendar className="h-4 w-4" /> Kalender
            </Button>
          </Link>
          <a href={GOOGLE_SHEETS_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ExternalLink className="h-4 w-4" /> Buka Google Sheet
            </Button>
          </a>
          <Button size="sm" className="gap-2 text-xs font-semibold" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kelas, tutor, atau mata pelajaran..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <select
            className="h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Semua Status</option>
            <option value="IN_PROGRESS">Sedang Berlangsung</option>
            <option value="STARTING_SOON">Segera Dimulai</option>
            <option value="SCHEDULED">Terjadwal</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Batal</option>
            <option value="DELAYED">Terlambat</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>Memuat jadwal real-time...</span>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-border">
            Belum ada jadwal yang sesuai dengan pencarian atau filter.
          </div>
        ) : (
          filteredSchedules.map((s) => {
            const config = statusBadgeConfig[s.computedStatus] || {
              label: s.computedStatus,
              variant: "info" as const,
            };

            return (
              <Card key={s.id} className="border-border/80 hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-foreground">
                        {s.class?.name || "Kelas"}
                      </span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {s.notes && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {s.notes}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {s.subject?.name || "Mata Pelajaran"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />{" "}
                        {s.tutor?.displayName || s.tutor?.name || "Tutor"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400" />{" "}
                        {s.room?.name || "Ruangan"}
                      </span>
                      <span>{s.branch?.name || "Cabang"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-foreground">
                        {formatTime(s.startAt)} - {formatTime(s.endAt)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(s.startAt)}</div>
                    </div>

                    <div className="flex items-center gap-1 border-l border-border pl-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDuplicateModal(s)}
                        title="Duplikat Jadwal (untuk kelas berulang minggu depan)"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(s)}
                        title="Edit Jadwal"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSchedule(s)}
                        title="Hapus Jadwal"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Modal Dialog */}
      {isCreatingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Tambah Jadwal Kelas Baru</h2>
                <p className="text-xs text-muted-foreground">Lengkapi rincian sesi belajar baru.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreatingSchedule(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {createError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Cabang</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value, roomId: "" })}
                    required
                  >
                    <option value="" disabled>Pilih Cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Ruangan {createForm.branchId ? "" : "(pilih Cabang dulu)"}
                  </label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs disabled:opacity-60"
                    value={createForm.roomId}
                    onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })}
                    disabled={!createForm.branchId}
                    required
                  >
                    <option value="" disabled>Pilih Ruangan</option>
                    {rooms
                      .filter((r) => !createForm.branchId || r.branchId === createForm.branchId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Program</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={createForm.programId}
                    onChange={(e) => setCreateForm({ ...createForm, programId: e.target.value, classId: "" })}
                    required
                  >
                    <option value="" disabled>Pilih Program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rombel / Kelas {createForm.programId ? "" : "(pilih Program dulu)"}
                  </label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs disabled:opacity-60"
                    value={createForm.classId}
                    onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                    disabled={!createForm.programId}
                    required
                  >
                    <option value="" disabled>Pilih Kelas</option>
                    {classes
                      .filter((c) => !createForm.programId || c.programId === createForm.programId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Mata Pelajaran</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={createForm.subjectId}
                    onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Pilih Mata Pelajaran</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Pengajar (KangGuru)</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={createForm.tutorId}
                    onChange={(e) => setCreateForm({ ...createForm, tutorId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Pilih Tutor</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Tanggal</label>
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Jam Mulai</label>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Jam Selesai</label>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Override Status Manual</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={createForm.manualStatus}
                    onChange={(e) => setCreateForm({ ...createForm, manualStatus: e.target.value })}
                  >
                    <option value="NONE">Otomatis (Berdasarkan Waktu)</option>
                    <option value="DELAYED">Terlambat (DELAYED)</option>
                    <option value="MOVED_ROOM">Pindah Ruangan (MOVED_ROOM)</option>
                    <option value="ONLINE">Kelas Online (ONLINE)</option>
                    <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Catatan Tambahan</label>
                  <Input
                    placeholder="Contoh: Pembahasan Soal HOTS"
                    className="h-9 text-xs"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreatingSchedule(false)}>
                  Batal
                </Button>
                <Button size="sm" type="submit" disabled={savingCreate} className="gap-2 font-semibold">
                  <Save className="h-4 w-4" /> {savingCreate ? "Menyimpan..." : "Tambah Jadwal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Dialog */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Edit Jadwal Kelas</h2>
                <p className="text-xs text-muted-foreground">Perbarui informasi pelaksanaan sesi les.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingSchedule(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Cabang</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value, roomId: "" })}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ruangan</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.roomId}
                    onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                    required
                  >
                    {rooms
                      .filter((r) => !editForm.branchId || r.branchId === editForm.branchId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Program</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.programId}
                    onChange={(e) => setEditForm({ ...editForm, programId: e.target.value, classId: "" })}
                    required
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Rombel / Kelas</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    required
                  >
                    {classes
                      .filter((c) => !editForm.programId || c.programId === editForm.programId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Mata Pelajaran</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.subjectId}
                    onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Pengajar (KangGuru)</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.tutorId}
                    onChange={(e) => setEditForm({ ...editForm, tutorId: e.target.value })}
                    required
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Tanggal</label>
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Jam Mulai</label>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Jam Selesai</label>
                  <Input
                    type="time"
                    className="h-9 text-xs"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Override Status Manual</label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-foreground text-xs"
                    value={editForm.manualStatus}
                    onChange={(e) => setEditForm({ ...editForm, manualStatus: e.target.value })}
                  >
                    <option value="NONE">Otomatis (Berdasarkan Waktu)</option>
                    <option value="DELAYED">Terlambat (DELAYED)</option>
                    <option value="MOVED_ROOM">Pindah Ruangan (MOVED_ROOM)</option>
                    <option value="ONLINE">Kelas Online (ONLINE)</option>
                    <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Catatan Tambahan</label>
                  <Input
                    placeholder="Contoh: Pembahasan Soal HOTS"
                    className="h-9 text-xs"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" type="button" onClick={() => setEditingSchedule(null)}>
                  Batal
                </Button>
                <Button size="sm" type="submit" disabled={savingEdit} className="gap-2 font-semibold">
                  <Save className="h-4 w-4" /> {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold text-foreground">Hapus Jadwal Kelas?</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal kelas{" "}
              <strong className="text-foreground">{deletingSchedule.subject?.name}</strong> (
              {deletingSchedule.class?.name})? Tindakan ini tidak dapat dibatalkan dan akan langsung berdampak pada tampilan TV Signage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setDeletingSchedule(null)} disabled={deleting}>
                Batal
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-2">
                {deleting ? "Menghapus..." : "Hapus Jadwal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
