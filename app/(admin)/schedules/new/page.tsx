"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertTriangle, Calendar, Clock, MapPin, User, BookOpen, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OptionItem {
  id: string;
  name: string;
}

export default function NewSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [branches, setBranches] = useState<OptionItem[]>([]);
  const [rooms, setRooms] = useState<OptionItem[]>([]);
  const [tutors, setTutors] = useState<OptionItem[]>([]);
  const [programs, setPrograms] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);

  const [form, setForm] = useState({
    branchId: "",
    roomId: "",
    tutorId: "",
    programId: "",
    classId: "",
    subjectId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "16:00",
    endTime: "17:30",
    notes: "",
  });

  useEffect(() => {
    // Fetch options from API endpoints
    async function loadOptions() {
      try {
        const [resBranches, resRooms, resTutors, resPrograms, resClasses, resSubjects] =
          await Promise.all([
            fetch("/api/v1/branches").then((r) => r.json()),
            fetch("/api/v1/rooms").then((r) => r.json()),
            fetch("/api/v1/tutors").then((r) => r.json()),
            fetch("/api/v1/programs").then((r) => r.json()),
            fetch("/api/v1/classes").then((r) => r.json()),
            fetch("/api/v1/subjects").then((r) => r.json()),
          ]);

        if (resBranches.success && resBranches.data.length > 0) {
          setBranches(resBranches.data);
          setForm((f) => ({ ...f, branchId: resBranches.data[0].id }));
        }
        if (resRooms.success && resRooms.data.length > 0) {
          setRooms(resRooms.data);
          setForm((f) => ({ ...f, roomId: resRooms.data[0].id }));
        }
        if (resTutors.success && resTutors.data.length > 0) {
          setTutors(resTutors.data);
          setForm((f) => ({ ...f, tutorId: resTutors.data[0].id }));
        }
        if (resPrograms.success && resPrograms.data.length > 0) {
          setPrograms(resPrograms.data);
          setForm((f) => ({ ...f, programId: resPrograms.data[0].id }));
        }
        if (resClasses.success && resClasses.data.length > 0) {
          setClasses(resClasses.data);
          setForm((f) => ({ ...f, classId: resClasses.data[0].id }));
        }
        if (resSubjects.success && resSubjects.data.length > 0) {
          setSubjects(resSubjects.data);
          setForm((f) => ({ ...f, subjectId: resSubjects.data[0].id }));
        }
      } catch (err) {
        console.error("Gagal memuat opsi form:", err);
      }
    }
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startAt = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endAt = new Date(`${form.date}T${form.endTime}:00`).toISOString();

      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: form.branchId,
          roomId: form.roomId,
          tutorId: form.tutorId,
          programId: form.programId,
          classId: form.classId,
          subjectId: form.subjectId,
          startAt,
          endAt,
          notes: form.notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal membuat jadwal baru");
      }

      router.push("/schedules");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan jadwal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/schedules">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tambah Jadwal Kelas Baru</h1>
            <p className="text-sm text-muted-foreground">
              Jadwal yang dipublish akan langsung tayang pada layar TV Kios Display secara real-time.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Informasi Sesi Pembelajaran</CardTitle>
          <CardDescription>
            Pilih cabang, ruangan, tutor, dan waktu pelaksanaan kelas.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid Baris 1: Cabang & Ruangan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Cabang Utama
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Ruangan Kelas
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  required
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid Baris 2: Program & Rombel Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Program Bimbingan
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.programId}
                  onChange={(e) => setForm({ ...form, programId: e.target.value })}
                  required
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Rombel / Kelas Siswa
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.classId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid Baris 3: Mata Pelajaran & Tutor (KangGuru) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Mata Pelajaran
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Pengajar (KangGuru)
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.tutorId}
                  onChange={(e) => setForm({ ...form, tutorId: e.target.value })}
                  required
                >
                  {tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid Baris 4: Tanggal & Jam */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal Pelaksanaan
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Jam Mulai
                </label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Jam Selesai
                </label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Catatan Sesi */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Catatan / Topik Pembahasan (Opsional)</label>
              <Input
                placeholder="Contoh: Pembahasan Soal HOTS Penalaran Matematika & TPS"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link href="/schedules">
                <Button variant="ghost" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan & Publish Jadwal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
