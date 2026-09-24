"use client";

import { GraduationCap } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface Tutor {
  id: string;
  name: string;
  displayName: string | null;
  title: string | null;
  photoUrl: string | null;
  aliases: string;
  isActive: boolean;
  _count: { schedules: number };
}

interface TutorForm {
  [key: string]: CrudFormValue;
  name: string;
  displayName: string;
  title: string;
  photoUrl: string;
  aliases: string;
  isActive: boolean;
}

function aliasesToText(value: string) {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

function textToAliases(value: CrudFormValue) {
  return String(value)
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

export default function TutorsPage() {
  return (
    <MasterCrudPage<Tutor, TutorForm>
      title="Kelola Tutor (KangGuru)"
      description="Tambah, perbarui, nonaktifkan, atau hapus profil tenaga pengajar."
      entityLabel="Tutor"
      endpoint="/api/v1/tutors"
      sourceUrl={GOOGLE_SHEETS_URL}
      emptyIcon={<GraduationCap className="h-8 w-8" />}
      initialValues={{
        name: "",
        displayName: "",
        title: "",
        photoUrl: "",
        aliases: "",
        isActive: true,
      }}
      fields={[
        { name: "name", label: "Nama lengkap", placeholder: "Nama resmi tutor", required: true },
        {
          name: "displayName",
          label: "Nama tampilan",
          placeholder: "Contoh: Kang Guru Fikri, S.Si",
        },
        { name: "title", label: "Gelar / spesialisasi", placeholder: "Contoh: Tutor Matematika" },
        { name: "photoUrl", label: "URL foto", type: "url", placeholder: "https://..." },
        { name: "aliases", label: "Alias", placeholder: "Pisahkan dengan koma" },
        { name: "isActive", label: "Tutor aktif", type: "checkbox" },
      ]}
      columns={[
        {
          header: "Tutor",
          render: (tutor) => (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                {tutor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {tutor.displayName || tutor.name}
                </p>
                <p className="text-xs text-muted-foreground">{tutor.name}</p>
              </div>
            </div>
          ),
        },
        {
          header: "Spesialisasi",
          render: (tutor) => (
            <span className="text-muted-foreground">{tutor.title || "Belum diisi"}</span>
          ),
        },
        {
          header: "Status",
          render: (tutor) => (
            <Badge variant={tutor.isActive ? "success" : "secondary"}>
              {tutor.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          ),
        },
        {
          header: "Relasi",
          render: (tutor) => (
            <span className="text-xs text-muted-foreground">
              {tutor._count.schedules} jadwal
            </span>
          ),
        },
      ]}
      toFormValues={(tutor) => ({
        name: tutor.name,
        displayName: tutor.displayName ?? "",
        title: tutor.title ?? "",
        photoUrl: tutor.photoUrl ?? "",
        aliases: aliasesToText(tutor.aliases),
        isActive: tutor.isActive,
      })}
      toPayload={(form) => ({
        name: String(form.name).trim(),
        displayName: String(form.displayName).trim(),
        title: String(form.title).trim(),
        photoUrl: String(form.photoUrl).trim(),
        aliases: textToAliases(form.aliases),
        isActive: Boolean(form.isActive),
      })}
      getSearchText={(tutor) =>
        `${tutor.name} ${tutor.displayName ?? ""} ${tutor.title ?? ""} ${aliasesToText(tutor.aliases)}`
      }
      getRecordLabel={(tutor) => tutor.displayName || tutor.name}
    />
  );
}
