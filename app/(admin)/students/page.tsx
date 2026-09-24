"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  GraduationCap,
  Phone,
  UserRound,
  Users,
  Volume2,
} from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";

interface BranchOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Student {
  id: string;
  nis: string;
  name: string;
  cardUid: string | null;
  className: string;
  voiceGender: "AUTO" | "MALE" | "FEMALE";
  branchId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  studentPhone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  _count: { attendances: number };
}

interface StudentForm {
  [key: string]: CrudFormValue;
  nis: string;
  name: string;
  className: string;
  cardUid: string;
  voiceGender: string;
  branchId: string;
  parentName: string;
  parentPhone: string;
  studentPhone: string;
  photoUrl: string;
  isActive: boolean;
}

const NO_BRANCH = "__none__";

const voiceLabels: Record<Student["voiceGender"], string> = {
  AUTO: "Otomatis dari nama",
  MALE: "Suara cowok",
  FEMALE: "Suara cewek",
};

export default function StudentsPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch("/api/v1/branches", { cache: "no-store" });
        const body = (await response.json()) as {
          success: boolean;
          data: BranchOption[];
        };
        if (response.ok && body.success) setBranches(body.data);
      } catch {
        setBranches([]);
      }
    };

    void loadBranches();
  }, []);

  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );

  return (
    <MasterCrudPage<Student, StudentForm>
      title="Data Siswa"
      description="Daftarkan identitas siswa, UID kartu, kontak orang tua, dan karakter suara attendance."
      entityLabel="Siswa"
      endpoint="/api/v1/students"
      emptyIcon={<Users className="h-8 w-8" />}
      initialValues={{
        nis: "",
        name: "",
        className: "",
        cardUid: "",
        voiceGender: "AUTO",
        branchId: NO_BRANCH,
        parentName: "",
        parentPhone: "",
        studentPhone: "",
        photoUrl: "",
        isActive: true,
      }}
      fields={[
        {
          name: "nis",
          label: "NIS / Nomor siswa",
          placeholder: "Contoh: 20260001",
          required: true,
        },
        {
          name: "name",
          label: "Nama lengkap",
          placeholder: "Contoh: Raka Pratama",
          required: true,
        },
        {
          name: "className",
          label: "Kelas / Rombel",
          placeholder: "Contoh: 12 ELC G",
          required: true,
        },
        {
          name: "branchId",
          label: "Cabang",
          type: "select",
          options: [
            { value: NO_BRANCH, label: "Belum ditentukan" },
            ...branches.map((branch) => ({
              value: branch.id,
              label: `${branch.name} (${branch.code})${branch.isActive ? "" : " - Nonaktif"}`,
            })),
          ],
        },
        {
          name: "cardUid",
          label: "UID kartu RFID/NFC",
          placeholder: "Tempel kartu atau ketik UID",
        },
        {
          name: "voiceGender",
          label: "Gender suara",
          type: "select",
          required: true,
          options: [
            { value: "AUTO", label: "Otomatis dari nama" },
            { value: "MALE", label: "Suara cowok" },
            { value: "FEMALE", label: "Suara cewek" },
          ],
        },
        {
          name: "parentName",
          label: "Nama orang tua/wali",
          placeholder: "Nama penerima notifikasi",
        },
        {
          name: "parentPhone",
          label: "WhatsApp orang tua",
          placeholder: "Contoh: 6281234567890",
        },
        {
          name: "studentPhone",
          label: "Nomor siswa",
          placeholder: "Opsional, format 628...",
        },
        {
          name: "photoUrl",
          label: "URL foto siswa",
          type: "url",
          placeholder: "https://...",
        },
        { name: "isActive", label: "Siswa aktif dan kartu dapat digunakan", type: "checkbox", fullWidth: true },
      ]}
      columns={[
        {
          header: "Siswa",
          render: (student) => (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{student.name}</p>
                <p className="text-xs text-muted-foreground">NIS {student.nis}</p>
              </div>
            </div>
          ),
        },
        {
          header: "Kelas & Cabang",
          render: (student) => (
            <div className="space-y-1 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                {student.className}
              </p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {student.branchId
                  ? branchById.get(student.branchId)?.name ?? "Cabang tidak ditemukan"
                  : "Belum ditentukan"}
              </p>
            </div>
          ),
        },
        {
          header: "Kartu",
          render: (student) =>
            student.cardUid ? (
              <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-300">
                <CreditCard className="h-3.5 w-3.5" /> {student.cardUid}
              </span>
            ) : (
              <Badge variant="secondary">Belum ada kartu</Badge>
            ),
        },
        {
          header: "Kontak Wali",
          render: (student) => (
            <div className="text-xs">
              <p className="font-medium text-foreground">{student.parentName || "Belum diisi"}</p>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" /> {student.parentPhone || "Tanpa nomor WhatsApp"}
              </p>
            </div>
          ),
        },
        {
          header: "Voice",
          render: (student) => (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              {voiceLabels[student.voiceGender]}
            </span>
          ),
        },
        {
          header: "Attendance",
          render: (student) => (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
              {student._count.attendances} tap
            </span>
          ),
        },
        {
          header: "Status",
          render: (student) => (
            <Badge variant={student.isActive ? "success" : "secondary"}>
              {student.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          ),
        },
      ]}
      toFormValues={(student) => ({
        nis: student.nis,
        name: student.name,
        className: student.className,
        cardUid: student.cardUid ?? "",
        voiceGender: student.voiceGender,
        branchId: student.branchId ?? NO_BRANCH,
        parentName: student.parentName ?? "",
        parentPhone: student.parentPhone ?? "",
        studentPhone: student.studentPhone ?? "",
        photoUrl: student.photoUrl ?? "",
        isActive: student.isActive,
      })}
      toPayload={(form) => ({
        nis: String(form.nis).trim(),
        name: String(form.name).trim(),
        className: String(form.className).trim(),
        cardUid: String(form.cardUid).trim() || null,
        voiceGender: String(form.voiceGender),
        branchId: form.branchId === NO_BRANCH ? null : String(form.branchId),
        parentName: String(form.parentName).trim() || null,
        parentPhone: String(form.parentPhone).trim() || null,
        studentPhone: String(form.studentPhone).trim() || null,
        photoUrl: String(form.photoUrl).trim() || null,
        isActive: Boolean(form.isActive),
      })}
      getSearchText={(student) =>
        [
          student.name,
          student.nis,
          student.className,
          student.cardUid,
          student.parentName,
          student.parentPhone,
          student.studentPhone,
          student.branchId ? branchById.get(student.branchId)?.name : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      getRecordLabel={(student) => student.name}
    />
  );
}
