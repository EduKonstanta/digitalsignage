"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAVIGATION } from "@/lib/navigation";
import { APP_NAME } from "@/lib/constants";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex flex-col w-4/5 max-w-xs bg-card border-r border-border h-full shadow-2xl z-10 overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center text-primary text-sm">
              K
            </div>
            <span>{APP_NAME}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6 flex-1">
          {ADMIN_NAVIGATION.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                {group.groupName}
              </h5>
              <div className="space-y-1 mt-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        item.isEmergency
                          ? "bg-rose-500/10 text-rose-400 font-bold"
                          : isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
