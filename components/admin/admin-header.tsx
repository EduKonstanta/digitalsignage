"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, Tv, Menu, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface AdminHeaderProps {
  admin: { name: string; email: string };
  onToggleMobileNav?: () => void;
}

export function AdminHeader({ admin, onToggleMobileNav }: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Nav Toggle & Search */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleMobileNav}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>

        <div className="relative w-48 sm:w-72 hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari jadwal, tutor, pengumuman..."
            className="pl-9 h-9 bg-background/50 border-border/80 text-xs focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Right: Display Live Link, Notifications & Profile */}
      <div className="flex items-center gap-2">
        <Link href="/display" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10">
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buka Display TV</span>
          </Button>
        </Link>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <div className="flex items-center gap-2 pl-1">
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-foreground">{admin.name}</span>
            <span className="text-[10px] text-muted-foreground">{admin.email}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-rose-400"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Keluar"
          title="Keluar"
        >
          {isLoggingOut ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
