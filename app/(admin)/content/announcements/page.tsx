"use client";

import { Megaphone } from "lucide-react";
import {
  CrudFormValues,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  category: string;
  priority: number;
  icon: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface AnnouncementForm extends CrudFormValues {
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: number;
  icon: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

const initialValues: AnnouncementForm = {
  title: "",
  summary: "",
  body: "",
  category: "INFORMASI",
  priority: 1,
  icon: "megaphone",
  imageUrl: "",
  startsAt: "",
  endsAt: "",
  status: "DRAFT",
};

function toInputDate(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default function AnnouncementsPage() {
  return (
    <MasterCrudPage<Announcement, AnnouncementForm>
      title="Kelola Pengumuman Signage"
      description="Buat, jadwalkan, publikasikan, edit, dan hapus pengumuman yang tampil di TV."
      entityLabel="Pengumuman"
      endpoint="/api/v1/announcements"
      initialValues={initialValues}
      fields={[
        { name: "title", label: "Judul", required: true, placeholder: "Contoh: Jadwal Tryout SNBT" },
        {
          name: "category",
          label: "Kategori",
          type: "select",
          required: true,
          options: ["INFORMASI", "AKADEMIK", "EVENT", "PROMOSI", "DARURAT"].map((value) => ({
            value,
            label: value,
          })),
        },
        { name: "summary", label: "Ringkasan", type: "textarea", fullWidth: true },
        { name: "body", label: "Isi lengkap", type: "textarea", fullWidth: true, required: true },
        {
          name: "priority",
          label: "Prioritas",
          type: "select",
          required: true,
          options: [
            { value: "1", label: "Normal" },
            { value: "2", label: "Tinggi" },
            { value: "3", label: "Mendesak" },
          ],
        },
        { name: "icon", label: "Nama ikon", placeholder: "megaphone" },
        { name: "imageUrl", label: "URL gambar (opsional)", type: "url", placeholder: "https://..." },
        { name: "startsAt", label: "Mulai tayang", type: "datetime-local", required: true },
        { name: "endsAt", label: "Selesai tayang", type: "datetime-local", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "DRAFT", label: "Draft" },
            { value: "SCHEDULED", label: "Terjadwal" },
            { value: "PUBLISHED", label: "Dipublikasikan" },
            { value: "EXPIRED", label: "Kedaluwarsa" },
            { value: "ARCHIVED", label: "Diarsipkan" },
          ],
        },
      ]}
      columns={[
        {
          header: "Pengumuman",
          render: (item) => (
            <div className="max-w-md">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.summary || item.body}
              </p>
            </div>
          ),
        },
        {
          header: "Kategori",
          render: (item) => <Badge variant="outline">{item.category}</Badge>,
        },
        {
          header: "Prioritas",
          render: (item) => (
            <Badge variant={item.priority === 3 ? "destructive" : item.priority === 2 ? "warning" : "secondary"}>
              {item.priority === 3 ? "Mendesak" : item.priority === 2 ? "Tinggi" : "Normal"}
            </Badge>
          ),
        },
        {
          header: "Periode",
          render: (item) => (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDate(item.startsAt)}<br />s.d. {formatDate(item.endsAt)}
            </span>
          ),
        },
        {
          header: "Status",
          render: (item) => (
            <Badge variant={item.status === "PUBLISHED" ? "success" : "outline"}>{item.status}</Badge>
          ),
        },
      ]}
      toFormValues={(item) => ({
        title: item.title,
        summary: item.summary ?? "",
        body: item.body,
        category: item.category,
        priority: item.priority,
        icon: item.icon ?? "",
        imageUrl: item.imageUrl ?? "",
        startsAt: toInputDate(item.startsAt),
        endsAt: toInputDate(item.endsAt),
        status: item.status,
      })}
      toPayload={(form) => ({
        ...form,
        priority: Number(form.priority),
        imageUrl: form.imageUrl || undefined,
        icon: form.icon || undefined,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
      })}
      getSearchText={(item) => `${item.title} ${item.summary ?? ""} ${item.body} ${item.category}`}
      getRecordLabel={(item) => item.title}
      emptyIcon={<Megaphone className="h-7 w-7" />}
    />
  );
}
