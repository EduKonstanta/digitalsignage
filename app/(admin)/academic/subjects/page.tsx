"use client";

import { BookOpen } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import {
  SUBJECT_ICON_OPTIONS,
  SubjectIcon,
} from "@/components/admin/subject-icons";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface Subject {
  id: string;
  name: string;
  shortName: string;
  icon: string | null;
  aliases: string;
  isActive: boolean;
  _count: { schedules: number };
}

interface SubjectForm {
  [key: string]: CrudFormValue;
  name: string;
  shortName: string;
  icon: string;
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

export default function SubjectsPage() {
  return (
    <MasterCrudPage<Subject, SubjectForm>
      title="Kelola Mata Pelajaran"
      description="Tambah, edit, nonaktifkan, dan hapus mata pelajaran."
      entityLabel="Mata Pelajaran"
      entityLabelLower="mata pelajaran"
      endpoint="/api/v1/subjects"
      sourceUrl={GOOGLE_SHEETS_URL}
      emptyIcon={<BookOpen className="h-8 w-8" />}
      initialValues={{
        name: "",
        shortName: "",
        icon: "book-open",
        aliases: "",
        isActive: true,
      }}
      fields={[
        {
          name: "name",
          label: "Nama mata pelajaran",
          placeholder: "Contoh: Penalaran Matematika",
          required: true,
        },
        {
          name: "shortName",
          label: "Singkatan",
          placeholder: "Contoh: Pen. Mat",
          required: true,
        },
        {
          name: "icon",
          label: "Pilih ikon mata pelajaran",
          type: "icon-picker",
          required: true,
          fullWidth: true,
          options: SUBJECT_ICON_OPTIONS.map(({ value, label, Icon }) => ({
            value,
            label,
            icon: <Icon className="h-4 w-4" />,
          })),
        },
        { name: "aliases", label: "Alias", placeholder: "Pisahkan dengan koma" },
        { name: "isActive", label: "Mata pelajaran aktif", type: "checkbox" },
      ]}
      columns={[
        {
          header: "Mata Pelajaran",
          render: (subject) => (
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/15 p-2 text-primary">
                <SubjectIcon name={subject.icon} className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{subject.name}</p>
                <p className="font-mono text-xs text-primary">{subject.shortName}</p>
              </div>
            </div>
          ),
        },
        {
          header: "Ikon",
          render: (subject) => (
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <SubjectIcon name={subject.icon} className="h-4 w-4 text-primary" />
              {subject.icon || "book-open"}
            </span>
          ),
        },
        {
          header: "Status",
          render: (subject) => (
            <Badge variant={subject.isActive ? "success" : "secondary"}>
              {subject.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          ),
        },
        {
          header: "Relasi",
          render: (subject) => (
            <span className="text-xs text-muted-foreground">
              {subject._count.schedules} jadwal
            </span>
          ),
        },
      ]}
      toFormValues={(subject) => ({
        name: subject.name,
        shortName: subject.shortName,
        icon: subject.icon ?? "",
        aliases: aliasesToText(subject.aliases),
        isActive: subject.isActive,
      })}
      toPayload={(form) => ({
        name: String(form.name).trim(),
        shortName: String(form.shortName).trim(),
        icon: String(form.icon).trim(),
        aliases: textToAliases(form.aliases),
        isActive: Boolean(form.isActive),
      })}
      getSearchText={(subject) =>
        `${subject.name} ${subject.shortName} ${subject.icon ?? ""} ${aliasesToText(subject.aliases)}`
      }
      getRecordLabel={(subject) => subject.name}
    />
  );
}
