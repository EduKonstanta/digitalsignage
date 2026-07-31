"use client";

import { useState } from "react";
import { Play, Type, X } from "lucide-react";
import {
  CrudFormValues,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RunningText {
  id: string;
  text: string;
  speed: number;
  separator: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface RunningTextForm extends CrudFormValues {
  text: string;
  speed: number;
  separator: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

const initialValues: RunningTextForm = {
  text: "",
  speed: 25,
  separator: "★",
  priority: 1,
  startsAt: "",
  endsAt: "",
  status: "PUBLISHED",
};

function toInputDate(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default function RunningTextPage() {
  const [preview, setPreview] = useState<RunningText | null>(null);

  return (
    <div className="space-y-5">
      {preview ? (
        <Card className="overflow-hidden border-primary/40 bg-slate-950">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 py-2">
            <CardTitle className="flex items-center gap-2 text-xs text-primary">
              <Play className="h-3.5 w-3.5" /> PREVIEW RUNNING TEXT TV
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              <X className="mr-1 h-3.5 w-3.5" /> Tutup
            </Button>
          </CardHeader>
          <CardContent className="overflow-hidden p-3">
            <div className="whitespace-nowrap rounded border border-slate-800 bg-slate-900/80 p-2 font-mono text-xs text-cyan-400">
              <span className="inline-block animate-marquee">
                {preview.text} &nbsp; {preview.separator} &nbsp; {preview.text}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <MasterCrudPage<RunningText, RunningTextForm>
        title="Kelola Running Text"
        description="Atur teks berjalan, kecepatan, prioritas, periode tayang, dan status publikasinya."
        entityLabel="Running Text"
        entityLabelLower="running text"
        endpoint="/api/v1/running-texts"
        initialValues={initialValues}
        fields={[
          { name: "text", label: "Isi running text", type: "textarea", fullWidth: true, required: true },
          { name: "speed", label: "Kecepatan animasi (detik)", type: "number", min: 5, required: true },
          { name: "separator", label: "Pemisah", required: true, placeholder: "★" },
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
          { name: "startsAt", label: "Mulai tayang", type: "datetime-local", required: true },
          { name: "endsAt", label: "Selesai tayang", type: "datetime-local", required: true },
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
            header: "Teks",
            render: (item) => <p className="max-w-lg text-sm leading-relaxed">{item.text}</p>,
          },
          {
            header: "Pengaturan",
            render: (item) => (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {item.speed} detik · prioritas {item.priority}
              </span>
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
          text: item.text,
          speed: item.speed,
          separator: item.separator,
          priority: item.priority,
          startsAt: toInputDate(item.startsAt),
          endsAt: toInputDate(item.endsAt),
          status: item.status,
        })}
        toPayload={(form) => ({
          ...form,
          speed: Number(form.speed),
          priority: Number(form.priority),
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        })}
        getSearchText={(item) => `${item.text} ${item.status}`}
        getRecordLabel={(item) => item.text.slice(0, 40)}
        emptyIcon={<Type className="h-7 w-7" />}
        renderExtraActions={(item) => (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPreview(item)}>
            <Play className="h-3.5 w-3.5" /> Preview
          </Button>
        )}
      />
    </div>
  );
}
