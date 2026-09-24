"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Layers3, Users2 } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface ProgramOption {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface AcademicClass {
  id: string;
  programId: string;
  name: string;
  academicYear: string;
  isActive: boolean;
  program: ProgramOption;
  _count: { schedules: number };
}

interface ClassForm {
  [key: string]: CrudFormValue;
  programId: string;
  name: string;
  academicYear: string;
  isActive: boolean;
}

export default function AcademicClassesPage() {
  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      const response = await fetch("/api/v1/programs", { cache: "no-store" });
      const body = (await response.json()) as { success: boolean; data: ProgramOption[] };
      if (response.ok && body.success) setPrograms(body.data);
    };
    void loadPrograms();
  }, []);

  return (
    <MasterCrudPage<AcademicClass, ClassForm>
      title="Kelola Rombel / Kelas"
      description="Tambah, edit, nonaktifkan, dan hapus kelompok belajar."
      entityLabel="Kelas"
      endpoint="/api/v1/classes"
      sourceUrl={GOOGLE_SHEETS_URL}
      canCreate={programs.length > 0}
      createDisabledMessage="Tambahkan program terlebih dahulu sebelum membuat kelas."
      emptyIcon={<Users2 className="h-8 w-8" />}
      initialValues={{
        programId: programs.find((program) => program.isActive)?.id ?? programs[0]?.id ?? "",
        name: "",
        academicYear: "2026/2027",
        isActive: true,
      }}
      fields={[
        {
          name: "programId",
          label: "Program",
          type: "select",
          required: true,
          options: programs.map((program) => ({
            value: program.id,
            label: `${program.name}${program.isActive ? "" : " (Nonaktif)"}`,
          })),
        },
        { name: "name", label: "Nama kelas", placeholder: "Contoh: 12 ELC G", required: true },
        {
          name: "academicYear",
          label: "Tahun akademik",
          placeholder: "2026/2027",
          required: true,
        },
        { name: "isActive", label: "Kelas aktif", type: "checkbox" },
      ]}
      columns={[
        {
          header: "Kelas",
          render: (academicClass) => (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: academicClass.program.color }}
              >
                <Users2 className="h-4 w-4" />
              </div>
              <p className="font-semibold text-foreground">{academicClass.name}</p>
            </div>
          ),
        },
        {
          header: "Program",
          render: (academicClass) => (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              {academicClass.program.name}
            </span>
          ),
        },
        {
          header: "Tahun Akademik",
          render: (academicClass) => (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {academicClass.academicYear}
            </span>
          ),
        },
        {
          header: "Status",
          render: (academicClass) => (
            <Badge variant={academicClass.isActive ? "success" : "secondary"}>
              {academicClass.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          ),
        },
        {
          header: "Relasi",
          render: (academicClass) => (
            <span className="text-xs text-muted-foreground">
              {academicClass._count.schedules} jadwal
            </span>
          ),
        },
      ]}
      toFormValues={(academicClass) => ({
        programId: academicClass.programId,
        name: academicClass.name,
        academicYear: academicClass.academicYear,
        isActive: academicClass.isActive,
      })}
      toPayload={(form) => ({
        programId: String(form.programId),
        name: String(form.name).trim(),
        academicYear: String(form.academicYear).trim(),
        isActive: Boolean(form.isActive),
      })}
      getSearchText={(academicClass) =>
        `${academicClass.name} ${academicClass.program.name} ${academicClass.academicYear}`
      }
      getRecordLabel={(academicClass) => academicClass.name}
    />
  );
}
