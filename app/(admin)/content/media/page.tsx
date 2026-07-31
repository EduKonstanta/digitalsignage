"use client";

import { ExternalLink, Film } from "lucide-react";
import {
  CrudFormValues,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MediaAsset {
  id: string;
  name: string;
  mediaType: string;
  fileUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  tags: string;
  status: string;
}

interface MediaForm extends CrudFormValues {
  name: string;
  mediaType: string;
  fileUrl: string;
  externalUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  width: string;
  height: string;
  mimeType: string;
  tags: string;
  status: string;
}

const initialValues: MediaForm = {
  name: "",
  mediaType: "IMAGE",
  fileUrl: "",
  externalUrl: "",
  thumbnailUrl: "",
  durationSeconds: 10,
  width: "",
  height: "",
  mimeType: "",
  tags: "",
  status: "PUBLISHED",
};

function parseTags(value: string) {
  try {
    const tags = JSON.parse(value);
    return Array.isArray(tags) ? tags.join(", ") : "";
  } catch {
    return value;
  }
}

function optionalPositive(value: string) {
  const number = Number(value);
  return value && Number.isFinite(number) && number > 0 ? number : undefined;
}

export default function MediaPage() {
  return (
    <MasterCrudPage<MediaAsset, MediaForm>
      title="Galeri Media Signage"
      description="Kelola gambar, video, audio, YouTube, slide, Canva, dan konten web melalui URL sumber."
      entityLabel="Media"
      endpoint="/api/v1/media"
      initialValues={initialValues}
      fields={[
        { name: "name", label: "Nama media", required: true, placeholder: "Contoh: Video Profil Konstanta" },
        {
          name: "mediaType",
          label: "Jenis media",
          type: "select",
          required: true,
          options: [
            ["IMAGE", "Gambar"],
            ["VIDEO", "Video"],
            ["AUDIO", "Audio"],
            ["YOUTUBE", "YouTube"],
            ["INSTAGRAM", "Instagram"],
            ["TIKTOK", "TikTok"],
            ["GOOGLE_DRIVE", "Google Drive"],
            ["GOOGLE_SLIDES", "Google Slides"],
            ["CANVA", "Canva"],
            ["WEB_EMBED", "Halaman web"],
          ].map(([value, label]) => ({ value, label })),
        },
        {
          name: "fileUrl",
          label: "URL utama / path file",
          placeholder: "Untuk Gambar/Video/Audio. Kosongkan jika mengisi URL embed di bawah.",
          fullWidth: true,
        },
        {
          name: "externalUrl",
          label: "URL embed (YouTube / Instagram / TikTok / dll)",
          placeholder: "Tempel link video YouTube, Instagram, atau TikTok di sini",
          fullWidth: true,
        },
        { name: "thumbnailUrl", label: "URL thumbnail", placeholder: "https://..." },
        { name: "durationSeconds", label: "Durasi tayang (detik)", type: "number", min: 1, required: true },
        { name: "mimeType", label: "MIME type", placeholder: "image/png atau video/mp4" },
        { name: "width", label: "Lebar piksel", type: "number", min: 1 },
        { name: "height", label: "Tinggi piksel", type: "number", min: 1 },
        { name: "tags", label: "Tag (pisahkan dengan koma)", placeholder: "promosi, snbt, lobby" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"].map((value) => ({
            value,
            label: value,
          })),
        },
      ]}
      columns={[
        {
          header: "Media",
          render: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="max-w-xs truncate text-xs text-muted-foreground">
                {item.fileUrl || item.externalUrl || "—"}
              </p>
            </div>
          ),
        },
        { header: "Jenis", render: (item) => <Badge variant="outline">{item.mediaType}</Badge> },
        {
          header: "Detail",
          render: (item) => (
            <span className="text-xs text-muted-foreground">
              {item.durationSeconds} detik
              {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
            </span>
          ),
        },
        {
          header: "Tag",
          render: (item) => <span className="text-xs text-muted-foreground">{parseTags(item.tags) || "—"}</span>,
        },
        {
          header: "Status",
          render: (item) => (
            <Badge variant={item.status === "PUBLISHED" ? "success" : "outline"}>{item.status}</Badge>
          ),
        },
      ]}
      toFormValues={(item) => ({
        name: item.name,
        mediaType: item.mediaType,
        fileUrl: item.fileUrl ?? "",
        externalUrl: item.externalUrl ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
        durationSeconds: item.durationSeconds,
        width: item.width ? String(item.width) : "",
        height: item.height ? String(item.height) : "",
        mimeType: item.mimeType ?? "",
        tags: parseTags(item.tags),
        status: item.status,
      })}
      toPayload={(form) => ({
        name: form.name,
        mediaType: form.mediaType,
        fileUrl: form.fileUrl || undefined,
        externalUrl: form.externalUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        durationSeconds: Number(form.durationSeconds),
        width: optionalPositive(form.width),
        height: optionalPositive(form.height),
        mimeType: form.mimeType || undefined,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        status: form.status,
      })}
      getSearchText={(item) =>
        `${item.name} ${item.mediaType} ${item.fileUrl ?? ""} ${item.externalUrl ?? ""} ${item.tags}`
      }
      getRecordLabel={(item) => item.name}
      emptyIcon={<Film className="h-7 w-7" />}
      renderExtraActions={(item) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            window.open(item.externalUrl || item.fileUrl || "#", "_blank", "noopener,noreferrer")
          }
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Preview
        </Button>
      )}
    />
  );
}
