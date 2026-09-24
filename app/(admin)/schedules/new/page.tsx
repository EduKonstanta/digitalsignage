"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";

export default function NewSchedulePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/schedules">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </Link>
      <Card className="border-blue-500/25 bg-blue-500/10">
        <CardHeader>
          <CardTitle>Jadwal dikelola dari Google Sheet</CardTitle>
          <CardDescription>
            Google Sheet sumber adalah satu-satunya database akademik. Tambahkan atau ubah jadwal di sana — perubahan
            langsung tayang tanpa langkah sinkronisasi tambahan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href={GOOGLE_SHEETS_URL} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <ExternalLink className="h-4 w-4" /> Buka Google Sheet
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
