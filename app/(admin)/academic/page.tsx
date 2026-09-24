"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, DoorOpen, GraduationCap, BookOpen, FolderKanban, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

import BranchesPage from "./branches/page";
import RoomsPage from "./rooms/page";
import TutorsPage from "./tutors/page";
import SubjectsPage from "./subjects/page";
import ProgramsPage from "./programs/page";
import AcademicClassesPage from "./classes/page";

const TABS = [
  { key: "branches", label: "Cabang", icon: Building2, Component: BranchesPage },
  { key: "rooms", label: "Ruangan", icon: DoorOpen, Component: RoomsPage },
  { key: "tutors", label: "Tutor (KangGuru)", icon: GraduationCap, Component: TutorsPage },
  { key: "subjects", label: "Mata Pelajaran", icon: BookOpen, Component: SubjectsPage },
  { key: "programs", label: "Program", icon: FolderKanban, Component: ProgramsPage },
  { key: "classes", label: "Rombel / Kelas", icon: Users2, Component: AcademicClassesPage },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AcademicTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "branches";
  const active = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];
  const ActiveComponent = active.Component;

  function selectTab(key: TabKey) {
    router.replace(`/academic?tab=${key}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Master Akademik</h1>
        <p className="text-sm text-muted-foreground">
          Semua data dasar sistem signage — cabang, ruangan, tutor, mata pelajaran, program, dan kelas — dalam satu halaman.
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

export default function AcademicHubPage() {
  return (
    <Suspense fallback={null}>
      <AcademicTabs />
    </Suspense>
  );
}
