"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAVIGATION } from "@/lib/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 z-30 select-none hidden md:flex">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-background p-1 border border-border flex items-center justify-center shadow-sm shrink-0">
          <img
            src="/logo.png"
            alt="Konstanta Education Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-base tracking-tight truncate text-foreground">
            {APP_NAME}
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wide uppercase font-medium">
            {APP_TAGLINE}
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {ADMIN_NAVIGATION.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h5 className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.groupName}
            </h5>
            <div className="space-y-0.5 mt-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                      item.isEmergency
                        ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 font-semibold"
                        : isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        item.isEmergency
                          ? "text-rose-400 animate-pulse"
                          : isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Version Tag */}
      <div className="p-3 border-t border-border bg-card/50 text-center">
        <span className="text-[10px] font-mono text-muted-foreground">
          Konstanta Signage Engine v1.0
        </span>
      </div>
    </aside>
  );
}
