"use client";

import React, { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { MobileNav } from "@/components/admin/mobile-nav";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";

interface AdminShellProps {
  admin: { name: string; email: string };
  children: React.ReactNode;
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader admin={admin} onToggleMobileNav={() => setMobileNavOpen(true)} />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
