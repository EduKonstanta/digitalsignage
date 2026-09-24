import {
  LayoutDashboard,
  Calendar,
  Database,
  Megaphone,
  Tv,
  Radio,
  AlertOctagon,
  Eye,
  Settings,
  Users,
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
      { title: "Konten", href: "/content", icon: Megaphone },
      { title: "Playlist Signage", href: "/playlists", icon: Radio },
    ],
  },
  {
    groupName: "Akademik & Master",
    items: [
      { title: "Data Master", href: "/academic", icon: Database },
      { title: "Data Siswa", href: "/students", icon: Users },
    ],
  },
  {
    groupName: "Perangkat",
    items: [
      { title: "Layar TV", href: "/screens", icon: Tv },
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
      { title: "Sistem", href: "/settings", icon: Settings },
    ],
  },
];
