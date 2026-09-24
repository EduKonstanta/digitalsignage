"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Edit3, ExternalLink, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";

export type CrudFormValue = string | number | boolean;
export type CrudFormValues = Record<string, CrudFormValue>;

export interface CrudSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface CrudField {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "select"
    | "checkbox"
    | "color"
    | "url"
    | "textarea"
    | "datetime-local"
    | "icon-picker";
  placeholder?: string;
  required?: boolean;
  min?: number;
  options?: CrudSelectOption[];
  fullWidth?: boolean;
}

export interface CrudColumn<T> {
  header: string;
  render: (record: T) => ReactNode;
  className?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
}

interface MasterCrudPageProps<T extends { id: string }, F extends CrudFormValues> {
  title: string;
  description: string;
  entityLabel: string;
  entityLabelLower?: string;
  endpoint: string;
  fields: CrudField[];
  columns: CrudColumn<T>[];
  initialValues: F;
  toFormValues: (record: T) => F;
  toPayload: (form: F) => unknown;
  getSearchText: (record: T) => string;
  getRecordLabel: (record: T) => string;
  emptyIcon: ReactNode;
  canCreate?: boolean;
  createDisabledMessage?: string;
  renderExtraActions?: (record: T) => ReactNode;
  refreshKey?: string | number;
  readOnly?: boolean;
  sourceUrl?: string;
}

export function MasterCrudPage<T extends { id: string }, F extends CrudFormValues>({
  title,
  description,
  entityLabel,
  entityLabelLower = entityLabel.toLocaleLowerCase("id-ID"),
  endpoint,
  fields,
  columns,
  initialValues,
  toFormValues,
  toPayload,
  getSearchText,
  getRecordLabel,
  emptyIcon,
  canCreate = true,
  createDisabledMessage,
  renderExtraActions,
  refreshKey,
  readOnly = false,
  sourceUrl,
}: MasterCrudPageProps<T, F>) {
  const [records, setRecords] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<F>(initialValues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = (await response.json()) as ApiResponse<T[]>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? `Gagal mengambil data ${entityLabelLower}.`);
      }
      setRecords(body.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : `Gagal memuat data ${entityLabelLower}.`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, entityLabelLower, refreshKey]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return records;
    return records.filter((record) =>
      getSearchText(record).toLocaleLowerCase("id-ID").includes(query),
    );
  }, [getSearchText, records, search]);

  function openCreateForm() {
    if (!canCreate) {
      setError(createDisabledMessage ?? `Data pendukung ${entityLabelLower} belum tersedia.`);
      return;
    }
    setEditingId(null);
    setForm(initialValues);
    setShowForm(true);
    setError(null);
    setSuccessMessage(null);
  }

  function openEditForm(record: T) {
    setEditingId(record.id);
    setForm(toFormValues(record));
    setShowForm(true);
    setError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialValues);
  }

  function updateField(name: string, value: CrudFormValue) {
    setForm((current) => ({ ...current, [name]: value }) as F);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const body = (await response.json()) as ApiResponse<T>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? `Gagal menyimpan ${entityLabelLower}.`);
      }

      setSuccessMessage(
        `${entityLabel} ${getRecordLabel(body.data)} berhasil ${
          editingId ? "diperbarui" : "ditambahkan"
        }.`,
      );
      closeForm();
      await loadRecords();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : `Gagal menyimpan ${entityLabelLower}.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(record: T) {
    const label = getRecordLabel(record);
    if (!window.confirm(`Hapus ${entityLabelLower} “${label}”? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeletingId(record.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${endpoint}/${record.id}`, { method: "DELETE" });
      const body = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? `Gagal menghapus ${entityLabelLower}.`);
      }

      setRecords((current) => current.filter((item) => item.id !== record.id));
      setSuccessMessage(`${entityLabel} ${label} berhasil dihapus.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : `Gagal menghapus ${entityLabelLower}.`,
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> Buka Google Sheet
              </Button>
            </a>
          ) : null}
          {!readOnly ? (
            <Button size="sm" className="gap-2" onClick={showForm ? closeForm : openCreateForm}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Tutup Form" : `Tambah ${entityLabel}`}
            </Button>
          ) : null}
        </div>
      </div>

      {readOnly ? (
        <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          Google Sheet adalah satu-satunya sumber data akademik. Edit data di Sheet, lalu jalankan sinkronisasi.
        </div>
      ) : null}

      {showForm && !readOnly ? (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {editingId ? `Edit ${entityLabel}` : `Tambah ${entityLabel} Baru`}
            </CardTitle>
            <CardDescription>
              Lengkapi data berikut, lalu simpan perubahan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map((field) => {
                  const value = form[field.name];
                  if (field.type === "checkbox") {
                    return (
                      <label
                        key={field.name}
                        className={`flex w-fit items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 ${
                          field.fullWidth ? "md:col-span-2" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) => updateField(field.name, event.target.checked)}
                          className="h-4 w-4 accent-blue-500"
                        />
                        <span className="text-sm">{field.label}</span>
                      </label>
                    );
                  }

                  return (
                    <label
                      key={field.name}
                      className={`space-y-1.5 ${field.fullWidth ? "md:col-span-2" : ""}`}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </span>
                      {field.type === "select" ? (
                        <select
                          value={String(value)}
                          onChange={(event) => updateField(field.name, event.target.value)}
                          required={field.required}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="" disabled>
                            Pilih {field.label.toLocaleLowerCase("id-ID")}
                          </option>
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "icon-picker" ? (
                        <div className="space-y-3 rounded-xl border border-border/70 bg-background/40 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                              {field.options?.find((option) => option.value === String(value))
                                ?.icon ?? <span className="text-xs">?</span>}
                            </div>
                            <select
                              value={String(value)}
                              onChange={(event) => updateField(field.name, event.target.value)}
                              required={field.required}
                              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="" disabled>
                                Pilih ikon
                              </option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label} — {option.value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
                            {field.options?.map((option) => {
                              const selected = option.value === String(value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  title={`${option.label} (${option.value})`}
                                  onClick={() => updateField(field.name, option.value)}
                                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                                    selected
                                      ? "border-primary bg-primary/15 text-primary"
                                      : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                  }`}
                                >
                                  {option.icon}
                                  <span className="w-full truncate text-[9px] font-medium">
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Klik ikon untuk memilih. Nama teknis ikon akan disimpan otomatis.
                          </p>
                        </div>
                      ) : field.type === "textarea" ? (
                        <textarea
                          value={String(value)}
                          onChange={(event) => updateField(field.name, event.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={4}
                          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      ) : field.type === "color" ? (
                        <div className="flex h-9 items-center gap-3 rounded-md border border-input bg-background px-2">
                          <input
                            type="color"
                            value={String(value)}
                            onChange={(event) => updateField(field.name, event.target.value)}
                            className="h-7 w-10 cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {String(value)}
                          </span>
                        </div>
                      ) : (
                        <Input
                          type={
                            field.type === "number"
                              ? "number"
                              : field.type === "url"
                                ? "url"
                                : field.type === "datetime-local"
                                  ? "datetime-local"
                                  : "text"
                          }
                          value={String(value)}
                          onChange={(event) =>
                            updateField(
                              field.name,
                              field.type === "number" && event.target.value !== ""
                                ? Number(event.target.value)
                                : event.target.value,
                            )
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          min={field.min}
                        />
                      )}
                    </label>
                  );
                })}
              </div>

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
                  {editingId ? "Simpan Perubahan" : `Tambah ${entityLabel}`}
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

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Cari ${entityLabelLower}...`}
          className="h-9 pl-9 text-xs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">
            Memuat data {entityLabelLower}...
          </span>
        </div>
      ) : error && records.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadRecords()} />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={records.length ? `${entityLabel} tidak ditemukan` : `Belum ada ${entityLabelLower}`}
          description={
            records.length
              ? "Ubah kata pencarian untuk melihat data lainnya."
              : `Tambahkan ${entityLabelLower} pertama untuk mulai menggunakan fitur ini.`
          }
          actionLabel={readOnly || records.length ? undefined : `Tambah ${entityLabel}`}
          onAction={readOnly || records.length ? undefined : openCreateForm}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-border/80 bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.header} className={`px-4 py-3 font-semibold ${column.className ?? ""}`}>
                      {column.header}
                    </th>
                  ))}
                  {!readOnly ? <th className="px-4 py-3 text-right font-semibold">Aksi</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-muted/15">
                    {columns.map((column) => (
                      <td key={column.header} className={`px-4 py-3 text-sm ${column.className ?? ""}`}>
                        {column.render(record)}
                      </td>
                    ))}
                    {!readOnly ? <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {renderExtraActions?.(record)}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEditForm(record)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                          disabled={deletingId === record.id}
                          onClick={() => void handleDelete(record)}
                        >
                          {deletingId === record.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Hapus
                        </Button>
                      </div>
                    </td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
