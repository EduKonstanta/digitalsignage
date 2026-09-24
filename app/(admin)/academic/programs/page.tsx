"use client";

import { FolderKanban } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface Program {
  id: string;
  name: string;
  level: string | null;
  color: string;
  isActive: boolean;
  classes: Array<{ id: string; name: string }>;
  _count: {
    classes: number;
    schedules: number;
  };
}

interface ProgramForm {
  [key: string]: CrudFormValue;
  name: string;
  level: string;
  color: string;
  isActive: boolean;
}

export default function ProgramsPage() {
  return (
    <MasterCrudPage<Program, ProgramForm>
      title="Kelola Program Bimbingan"
      description="Tambah, edit, nonaktifkan, dan hapus program akademik."
      entityLabel="Program"
      endpoint="/api/v1/programs"
      sourceUrl={GOOGLE_SHEETS_URL}
      emptyIcon={<FolderKanban className="h-8 w-8" />}
      initialValues={{
        name: "",
        level: "",
        color: "#3B82F6",
        isActive: true,
      }}
      fields={[
        { name: "name", label: "Nama program", placeholder: "Contoh: ELC", required: true },
        { name: "level", label: "Tingkat / jenjang", placeholder: "Contoh: Kelas 9-12" },
        { name: "color", label: "Warna program", type: "color", required: true },
        { name: "isActive", label: "Program aktif", type: "checkbox" },
      ]}
      columns={[
        {
          header: "Program",
          render: (program) => (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: program.color }}
              >
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{program.name}</p>
                <p className="text-xs text-muted-foreground">{program.level || "Tanpa jenjang"}</p>
              </div>
            </div>
          ),
        },
        {
          header: "Warna",
          render: (program) => (
            <span className="font-mono text-xs text-muted-foreground">{program.color}</span>
          ),
        },
        {
          header: "Status",
          render: (program) => (
            <Badge variant={program.isActive ? "success" : "secondary"}>
              {program.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          ),
        },
        {
          header: "Relasi",
          render: (program) => (
            <span className="text-xs text-muted-foreground">
              {program._count.classes} kelas · {program._count.schedules} jadwal
            </span>
          ),
        },
      ]}
      toFormValues={(program) => ({
        name: program.name,
        level: program.level ?? "",
        color: program.color,
        isActive: program.isActive,
      })}
      toPayload={(form) => ({
        name: String(form.name).trim(),
        level: String(form.level).trim(),
        color: String(form.color),
        isActive: Boolean(form.isActive),
      })}
      getSearchText={(program) => `${program.name} ${program.level ?? ""} ${program.color}`}
      getRecordLabel={(program) => program.name}
    />
  );
}
