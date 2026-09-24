import React from "react";
import { redirect } from "next/navigation";
import { getAdminFromSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromSession();

  if (!admin) {
    redirect("/login");
  }

  return (
    <AdminShell admin={{ name: admin.name, email: admin.email }}>
      {children}
    </AdminShell>
  );
}
