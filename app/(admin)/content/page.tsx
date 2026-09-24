"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Film, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

import AnnouncementsPage from "./announcements/page";
import MediaPage from "./media/page";
import RunningTextPage from "./running-text/page";
import VoiceAnnouncementsPage from "./voice/page";

const TABS = [
  { key: "announcements", label: "Pengumuman", icon: Megaphone, Component: AnnouncementsPage },
  { key: "media", label: "Galeri Media", icon: Film, Component: MediaPage },
  { key: "running-text", label: "Running Text", icon: Type, Component: RunningTextPage },
  { key: "voice", label: "Informasi Suara", icon: Mic, Component: VoiceAnnouncementsPage },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ContentTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "announcements";
  const active = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];
  const ActiveComponent = active.Component;

  function selectTab(key: TabKey) {
    router.replace(`/content?tab=${key}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Konten Layar TV</h1>
        <p className="text-sm text-muted-foreground">
          Semua yang tampil di layar TV — pengumuman, media, running text, dan info suara — dalam satu halaman.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/80 bg-card/40 p-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ActiveComponent />
    </div>
  );
}

export default function ContentHubPage() {
  return (
    <Suspense fallback={null}>
      <ContentTabs />
    </Suspense>
  );
}
