"use client";

import { useEffect, useState } from "react";
import { History, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoaderCircle } from "lucide-react";

interface ActivityLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { name: string; email: string } | null;
}

interface ApiResponse {
  success: boolean;
  data: ActivityLogRecord[];
  error?: { message?: string };
}

export default function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/activity-logs", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal memuat log aktivitas.");
      }
      setLogs(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat log aktivitas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  const query = search.trim().toLocaleLowerCase("id-ID");
  const filteredLogs = query
    ? logs.filter((log) =>
        [log.action, log.entityType, log.entityId ?? "", log.admin?.name ?? "", log.admin?.email ?? ""]
          .join(" ")
          .toLocaleLowerCase("id-ID")
          .includes(query),
      )
    : logs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Log Aktivitas & Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Riwayat perubahan data dan tindakan administratif pada sistem.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari log..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-border/70 bg-card/30">
          <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Memuat log aktivitas...</span>
        </div>
      ) : error && logs.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadLogs()} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title={logs.length ? "Log tidak ditemukan" : "Belum ada aktivitas"}
          description={
            logs.length
              ? "Ubah kata pencarian untuk melihat log lainnya."
              : "Aktivitas admin (buat/ubah/hapus data) akan tercatat di sini."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="border-border/80 hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{log.action}</div>
                    <div className="text-muted-foreground mt-0.5">
                      {log.entityType}
                      {log.entityId ? ` (${log.entityId})` : ""} • Aktor: {log.admin?.name ?? "Tidak diketahui"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                  {log.ipAddress ? (
                    <div className="text-[10px] text-muted-foreground">IP: {log.ipAddress}</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
