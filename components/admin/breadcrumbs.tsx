"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  schedules: "Jadwal Kelas",
  calendar: "Kalender",
  new: "Tambah Baru",
  edit: "Edit",
  academic: "Akademik",
  branches: "Cabang",
  rooms: "Ruangan",
  tutors: "Tutor (KangGuru)",
  subjects: "Mata Pelajaran",
  programs: "Program",
  classes: "Kelas Rombel",
  content: "Konten",
  announcements: "Pengumuman",
  media: "Galeri Media",
  "running-text": "Running Text",
  voice: "Informasi Suara",
  templates: "Template",
  playlists: "Playlist",
  screens: "Layar Display",
  pairing: "Pairing",
  integrations: "Integrasi",
  emergency: "Emergency Broadcast",
  preview: "Simulasi Preview",
  "activity-logs": "Log Aktivitas",
  settings: "Pengaturan",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
      <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </Link>

      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = ROUTE_LABELS[segment] || segment;

        return (
          <div key={url} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-semibold text-foreground capitalize">{label}</span>
            ) : (
              <Link href={url} className="hover:text-foreground transition-colors capitalize">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
