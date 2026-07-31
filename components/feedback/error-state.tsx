import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Silakan coba lagi.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-rose-500/20 bg-rose-500/5 rounded-xl my-4">
      <div className="p-3 bg-rose-500/10 rounded-full mb-3 text-rose-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h4 className="text-base font-semibold text-rose-200">{title}</h4>
      <p className="text-sm text-rose-300/80 max-w-sm mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
