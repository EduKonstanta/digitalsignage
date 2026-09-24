"use client";

import { BadgeCheck, CreditCard, UserRound, Users } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
  cardUid: string | null;
  isActive: boolean;
  _count: { attendances: number };
}

interface StudentForm {
  [key: string]: CrudFormValue;
  name: string;
  cardUid: string;
}

export default function StudentsPage() {
  return (
    <MasterCrudPage<Student, StudentForm>
      title="Data Siswa"
      description="Daftarkan nama siswa dan UID kartu RFID untuk menampilkan notifikasi tap pada Digital Signage."
      entityLabel="Siswa"
      endpoint="/api/v1/students"
      emptyIcon={<Users className="h-8 w-8" />}
      initialValues={{
        name: "",
        cardUid: "",
      }}
      fields={[
        {
          name: "name",
          label: "Nama siswa",
          placeholder: "Contoh: Raka Pratama",
          required: true,
        },
        {
          name: "cardUid",
          label: "UID kartu RFID",
          placeholder: "Tempel kartu atau ketik UID",
          required: true,
        },
      ]}
      columns={[
        {
          header: "Nama Siswa",
          render: (student) => (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" />
              </div>
              <p className="font-semibold text-foreground">{student.name}</p>
            </div>
          ),
        },
        {
          header: "UID RFID",
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
          header: "Notifikasi Signage",
          render: (student) => (
            <div className="flex items-center gap-2">
              <Badge variant={student.isActive ? "success" : "secondary"}>
                {student.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                {student._count.attendances} tap
              </span>
            </div>
          ),
        },
      ]}
      toFormValues={(student) => ({
        name: student.name,
        cardUid: student.cardUid ?? "",
      })}
      toPayload={(form) => ({
        name: String(form.name).trim(),
        cardUid: String(form.cardUid).trim(),
      })}
      getSearchText={(student) => `${student.name} ${student.cardUid ?? ""}`}
      getRecordLabel={(student) => student.name}
    />
  );
}
