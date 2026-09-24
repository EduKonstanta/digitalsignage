"use client";

import { useEffect, useState } from "react";
import { Building2, DoorOpen, Users } from "lucide-react";
import {
  CrudFormValue,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface Room {
  id: string;
  branchId: string;
  name: string;
  floor: number;
  capacity: number | null;
  status: string;
  aliases: string;
  branch: BranchOption;
  _count: {
    schedules: number;
    screens: number;
  };
}

interface RoomForm {
  [key: string]: CrudFormValue;
  branchId: string;
  name: string;
  floor: number;
  capacity: string | number;
  status: string;
  aliases: string;
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

export default function RoomsPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      const response = await fetch("/api/v1/branches", { cache: "no-store" });
      const body = (await response.json()) as { success: boolean; data: BranchOption[] };
      if (response.ok && body.success) setBranches(body.data);
    };
    void loadBranches();
  }, []);

  return (
    <MasterCrudPage<Room, RoomForm>
      title="Kelola Ruangan Kelas"
      description="Tambah, edit, dan hapus ruangan belajar pada setiap cabang."
      entityLabel="Ruangan"
      entityLabelLower="ruangan"
      endpoint="/api/v1/rooms"
      sourceUrl={GOOGLE_SHEETS_URL}
      canCreate={branches.length > 0}
      createDisabledMessage="Tambahkan cabang terlebih dahulu sebelum membuat ruangan."
      emptyIcon={<DoorOpen className="h-8 w-8" />}
      initialValues={{
        branchId: branches[0]?.id ?? "",
        name: "",
        floor: 1,
        capacity: "",
        status: "AVAILABLE",
        aliases: "",
      }}
      fields={[
        {
          name: "branchId",
          label: "Cabang",
          type: "select",
          required: true,
          options: branches.map((branch) => ({
            value: branch.id,
            label: `${branch.name} (${branch.code})`,
          })),
        },
        { name: "name", label: "Nama ruangan", placeholder: "Contoh: Growie", required: true },
        { name: "floor", label: "Lantai", type: "number", min: 0, required: true },
        { name: "capacity", label: "Kapasitas siswa", type: "number", min: 1 },
        {
          name: "status",
          label: "Status ruangan",
          type: "select",
          required: true,
          options: [
            { value: "AVAILABLE", label: "Tersedia" },
            { value: "OCCUPIED", label: "Dipakai" },
            { value: "MAINTENANCE", label: "Pemeliharaan" },
          ],
        },
        {
          name: "aliases",
          label: "Alias",
          placeholder: "Pisahkan dengan koma, contoh: R101, Ruang 101",
        },
      ]}
      columns={[
        {
          header: "Ruangan",
          render: (room) => (
            <div>
              <p className="font-semibold text-foreground">{room.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Lantai {room.floor}</p>
            </div>
          ),
        },
        {
          header: "Cabang",
          render: (room) => (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {room.branch.name}
            </span>
          ),
        },
        {
          header: "Kapasitas",
          render: (room) => (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {room.capacity ? `${room.capacity} siswa` : "Belum diatur"}
            </span>
          ),
        },
        {
          header: "Status",
          render: (room) => (
            <Badge
              variant={
                room.status === "AVAILABLE"
                  ? "success"
                  : room.status === "OCCUPIED"
                    ? "warning"
                    : "secondary"
              }
            >
              {room.status === "AVAILABLE"
                ? "Tersedia"
                : room.status === "OCCUPIED"
                  ? "Dipakai"
                  : "Pemeliharaan"}
            </Badge>
          ),
        },
        {
          header: "Relasi",
          render: (room) => (
            <span className="text-xs text-muted-foreground">
              {room._count.schedules} jadwal · {room._count.screens} layar
            </span>
          ),
        },
      ]}
      toFormValues={(room) => ({
        branchId: room.branchId,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity ?? "",
        status: room.status,
        aliases: aliasesToText(room.aliases),
      })}
      toPayload={(form) => ({
        branchId: String(form.branchId),
        name: String(form.name).trim(),
        floor: Number(form.floor),
        capacity: form.capacity === "" ? undefined : Number(form.capacity),
        status: String(form.status),
        aliases: textToAliases(form.aliases),
      })}
      getSearchText={(room) =>
        `${room.name} ${room.branch.name} ${room.branch.code} ${room.status} ${aliasesToText(room.aliases)}`
      }
      getRecordLabel={(room) => room.name}
    />
  );
}
