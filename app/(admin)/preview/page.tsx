"use client";

import React, { useState } from "react";
import { Eye, Monitor, Clock, Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PreviewPage() {
  const [resolution, setResolution] = useState<"1080p" | "720p" | "4k">("1080p");
  const [simulatedTime, setSimulatedTime] = useState("16:30");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Simulasi Preview Display</h1>
          <p className="text-sm text-muted-foreground">Uji tampilan layout pada berbagai resolusi TV dan simulasi waktu.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={resolution === "1080p" ? "default" : "outline"}
            size="sm"
            onClick={() => setResolution("1080p")}
          >
            1080p (FHD)
          </Button>
          <Button
            variant={resolution === "720p" ? "default" : "outline"}
            size="sm"
            onClick={() => setResolution("720p")}
          >
            720p (HD)
          </Button>
          <Button
            variant={resolution === "4k" ? "default" : "outline"}
            size="sm"
            onClick={() => setResolution("4k")}
          >
            4K (UHD)
          </Button>
        </div>
      </div>

      <Card className="border-border/80 p-2 overflow-hidden bg-slate-950">
        <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative shadow-2xl">
          <iframe
            src="/display"
            className="w-full h-full border-0 pointer-events-none"
            title="Display Preview Simulator"
          />
        </div>
      </Card>
    </div>
  );
}
