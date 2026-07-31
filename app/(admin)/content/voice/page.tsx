"use client";

import { Play, Volume2 } from "lucide-react";
import {
  CrudFormValues,
  MasterCrudPage,
} from "@/components/admin/master-crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VoiceAnnouncement {
  id: string;
  text: string;
  audioUrl: string | null;
  openingAudioUrl: string | null;
  voiceName: string;
  language: string;
  volume: number;
  repetitions: number;
  intervalSeconds: number;
  scheduledAt: string;
  priority: number;
  status: string;
  _count?: { logs: number };
}

interface VoiceForm extends CrudFormValues {
  text: string;
  audioUrl: string;
  openingAudioUrl: string;
  voiceName: string;
  language: string;
  volume: number;
  repetitions: number;
  intervalSeconds: number;
  scheduledAt: string;
  priority: number;
  status: string;
}

const initialValues: VoiceForm = {
  text: "",
  audioUrl: "",
  openingAudioUrl: "",
  voiceName: "id-ID-Wavenet-A",
  language: "id-ID",
  volume: 100,
  repetitions: 1,
  intervalSeconds: 0,
  scheduledAt: "",
  priority: 1,
  status: "SCHEDULED",
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

function testVoice(item: VoiceAnnouncement) {
  if (item.audioUrl) {
    const audio = new Audio(item.audioUrl);
    audio.volume = item.volume / 100;
    void audio.play();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(item.text);
  utterance.lang = item.language;
  utterance.volume = item.volume / 100;
  const voice = window.speechSynthesis
    .getVoices()
    .find((candidate) => candidate.name === item.voiceName || candidate.lang === item.language);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export default function VoiceAnnouncementsPage() {
  return (
    <MasterCrudPage<VoiceAnnouncement, VoiceForm>
      title="Informasi Suara & Text-to-Speech"
      description="Jadwalkan audio atau teks suara, atur volume, pengulangan, prioritas, dan uji hasilnya."
      entityLabel="Informasi Suara"
      entityLabelLower="informasi suara"
      endpoint="/api/v1/voice-announcements"
      initialValues={initialValues}
      fields={[
        { name: "text", label: "Teks yang dibacakan", type: "textarea", fullWidth: true, required: true },
        { name: "audioUrl", label: "URL audio siap putar (opsional)", placeholder: "https://... atau /audio/pengumuman.mp3" },
        { name: "openingAudioUrl", label: "URL audio pembuka (opsional)", placeholder: "https://... atau /audio/bell.mp3" },
        {
          name: "voiceName",
          label: "Suara TTS",
          type: "select",
          required: true,
          options: [
            { value: "id-ID-Wavenet-A", label: "Indonesia — Perempuan A" },
            { value: "id-ID-Wavenet-B", label: "Indonesia — Laki-laki B" },
            { value: "id-ID-Standard-A", label: "Indonesia — Standar A" },
            { value: "id-ID-Standard-B", label: "Indonesia — Standar B" },
          ],
        },
        {
          name: "language",
          label: "Bahasa",
          type: "select",
          required: true,
          options: [
            { value: "id-ID", label: "Bahasa Indonesia" },
            { value: "en-US", label: "English (US)" },
            { value: "en-GB", label: "English (UK)" },
          ],
        },
        { name: "volume", label: "Volume (0–100)", type: "number", min: 0, required: true },
        { name: "repetitions", label: "Jumlah pengulangan", type: "number", min: 1, required: true },
        { name: "intervalSeconds", label: "Jeda antar-pengulangan (detik)", type: "number", min: 0, required: true },
        { name: "scheduledAt", label: "Waktu tayang", type: "datetime-local", required: true },
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
          header: "Informasi suara",
          render: (item) => <p className="max-w-lg text-sm leading-relaxed">{item.text}</p>,
        },
        {
          header: "Jadwal",
          render: (item) => <span className="whitespace-nowrap text-xs">{formatDate(item.scheduledAt)}</span>,
        },
        {
          header: "Pemutaran",
          render: (item) => (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {item.repetitions}× · volume {item.volume}% · {item._count?.logs ?? 0} log
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
        audioUrl: item.audioUrl ?? "",
        openingAudioUrl: item.openingAudioUrl ?? "",
        voiceName: item.voiceName,
        language: item.language,
        volume: item.volume,
        repetitions: item.repetitions,
        intervalSeconds: item.intervalSeconds,
        scheduledAt: toInputDate(item.scheduledAt),
        priority: item.priority,
        status: item.status,
      })}
      toPayload={(form) => ({
        ...form,
        audioUrl: form.audioUrl || undefined,
        openingAudioUrl: form.openingAudioUrl || undefined,
        volume: Number(form.volume),
        repetitions: Number(form.repetitions),
        intervalSeconds: Number(form.intervalSeconds),
        priority: Number(form.priority),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      })}
      getSearchText={(item) => `${item.text} ${item.voiceName} ${item.status}`}
      getRecordLabel={(item) => item.text.slice(0, 40)}
      emptyIcon={<Volume2 className="h-7 w-7" />}
      renderExtraActions={(item) => (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => testVoice(item)}>
          <Play className="h-3.5 w-3.5" /> Uji Suara
        </Button>
      )}
    />
  );
}
