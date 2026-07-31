import {
  LayoutDashboard,
  Calendar,
  Building2,
  DoorOpen,
  GraduationCap,
  BookOpen,
  FolderKanban,
  Users2,
  Megaphone,
  Film,
  Type,
  Mic,
  Tv,
  Radio,
  FileSpreadsheet,
  AlertOctagon,
  Eye,
  History,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isEmergency?: boolean;
}

export interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export const ADMIN_NAVIGATION: NavGroup[] = [
  {
    groupName: "Utama",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Jadwal Kelas", href: "/schedules", icon: Calendar },
    ],
  },
  {
    groupName: "Konten & Media",
    items: [
      { title: "Pengumuman", href: "/content/announcements", icon: Megaphone },
      { title: "Galeri Media", href: "/content/media", icon: Film },
      { title: "Running Text", href: "/content/running-text", icon: Type },
      { title: "Informasi Suara", href: "/content/voice", icon: Mic },
      { title: "Playlist Signage", href: "/playlists", icon: Radio },
    ],
  },
  {
    groupName: "Akademik & Master",
    items: [
      { title: "Cabang", href: "/academic/branches", icon: Building2 },
      { title: "Ruangan", href: "/academic/rooms", icon: DoorOpen },
      { title: "Tutor (KangGuru)", href: "/academic/tutors", icon: GraduationCap },
      { title: "Mata Pelajaran", href: "/academic/subjects", icon: BookOpen },
      { title: "Program", href: "/academic/programs", icon: FolderKanban },
      { title: "Rombel / Kelas", href: "/academic/classes", icon: Users2 },
    ],
  },
  {
    groupName: "Perangkat & Integrasi",
    items: [
      { title: "Daftar Layar Display", href: "/screens", icon: Tv },
      { title: "Google Sheets", href: "/integrations", icon: FileSpreadsheet },
      { title: "Simulasi Preview", href: "/preview", icon: Eye },
    ],
  },
  {
    groupName: "Sistem & Kontrol",
    items: [
      {
        title: "Emergency Broadcast",
        href: "/emergency",
        icon: AlertOctagon,
        isEmergency: true,
      },
      { title: "Log Aktivitas", href: "/activity-logs", icon: History },
      { title: "Pengaturan", href: "/settings", icon: Settings },
    ],
  },
];
