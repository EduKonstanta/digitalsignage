"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, LoaderCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FIELD_LABELS,
  REQUIRED_FIELDS,
  StudentFieldKey,
  parseStudentCsv,
} from "@/lib/student-import";

interface StudentImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: { nis: string; name: string; status: string; reason?: string }[];
}

const CONTOH_CSV = `NIS,Nama,Kelas,UID Kartu,Nama Ortu,WhatsApp Ortu
2026001,Raka Pratama,12 IPA 1,,Budi Pratama,081234567890
2026002,Sinta Dewi,12 IPS 2,,Rina Dewi,081298765432`;

export function StudentImportModal({ onClose, onImported }: StudentImportModalProps) {
  const [text, setText] = useState("");
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "update">("skip");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const parsed = useMemo(() => parseStudentCsv(text), [text]);
  const validRows = parsed.rows.filter((row) => row.errors.length === 0);
  const badRows = parsed.rows.filter((row) => row.errors.length > 0);
  const canImport = parsed.missingRequired.length === 0 && validRows.length > 0 && !isSaving;

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleImport() {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onDuplicate,
          rows: validRows.map((row) => ({
            nis: row.nis,
            name: row.name,
            className: row.className,
            cardUid: row.cardUid,
            parentName: row.parentName,
            parentPhone: row.parentPhone,
            studentPhone: row.studentPhone,
            voiceGender: row.voiceGender,
          })),
        }),
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: ImportSummary;
        error?: { message?: string };
      };
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Gagal mengimpor data siswa.");
      }
      setSummary(body.data);
      onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Gagal mengimpor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Impor Siswa dari Berkas</h2>
            <p className="text-xs text-muted-foreground">
              Unggah CSV dari sistem lain, atau tempel langsung dari Excel.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {summary ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Impor selesai.</p>
                  <p className="text-xs">
                    {summary.created} ditambahkan, {summary.updated} diperbarui,{" "}
                    {summary.skipped} dilewati, {summary.failed} gagal.
                  </p>
                </div>
              </div>

              {summary.failed > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-rose-500/25 bg-rose-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-rose-300">Baris yang gagal:</p>
                  <ul className="space-y-1 text-xs text-rose-200">
                    {summary.results
                      .filter((row) => row.status === "failed")
                      .map((row) => (
                        <li key={row.nis}>
                          <span className="font-mono">{row.nis}</span> {row.name} — {row.reason}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button onClick={onClose}>Selesai</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                  <FileUp className="h-4 w-4" />
                  Pilih berkas CSV
                  <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => setText(CONTOH_CSV)}
                  className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Isi contoh
                </button>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                spellCheck={false}
                placeholder={"Tempel isi CSV di sini, baris pertama berisi nama kolom.\n\n" + CONTOH_CSV}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
              />

              {text.trim() ? (
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-3">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-foreground">Kolom yang dikenali</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(FIELD_LABELS) as StudentFieldKey[]).map((field) => {
                        const index = parsed.mapping[field];
                        const found = index !== undefined;
                        const required = REQUIRED_FIELDS.includes(field);
                        return (
                          <span
                            key={field}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              found
                                ? "bg-emerald-500/15 text-emerald-300"
                                : required
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {FIELD_LABELS[field]}
                            {found ? ` → ${parsed.headers[index]}` : required ? " — tidak ada" : " — kosong"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {parsed.missingRequired.length > 0 ? (
                    <div className="flex items-start gap-2 rounded border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Kolom wajib belum ditemukan:{" "}
                        {parsed.missingRequired.map((field) => FIELD_LABELS[field]).join(", ")}. Ubah
                        nama kolom di baris pertama berkasmu.
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{validRows.length} baris</strong> siap diimpor
                      {badRows.length > 0 ? `, ${badRows.length} baris bermasalah akan dilewati` : ""}.
                    </p>
                  )}

                  {badRows.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto rounded border border-amber-500/25 bg-amber-500/5 p-2 text-[11px] text-amber-200">
                      {badRows.slice(0, 20).map((row) => (
                        <div key={row.rowNumber}>
                          Baris {row.rowNumber}: {row.errors.join(", ")}
                        </div>
                      ))}
                      {badRows.length > 20 ? <div>...dan {badRows.length - 20} lagi</div> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={onDuplicate === "update"}
                  onChange={(event) => setOnDuplicate(event.target.checked ? "update" : "skip")}
                  className="h-3.5 w-3.5 accent-blue-500"
                />
                Perbarui data siswa yang NIS-nya sudah terdaftar (bawaannya dilewati)
              </label>

              {error ? (
                <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button onClick={() => void handleImport()} disabled={!canImport} className="gap-2">
                  {isSaving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Impor {validRows.length > 0 ? `${validRows.length} Siswa` : ""}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
