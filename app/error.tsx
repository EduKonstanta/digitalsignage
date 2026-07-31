"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ErrorState
        title="Aplikasi Mengalami Kesalahan"
        message={error.message || "Terjadi masalah saat memuat halaman."}
        onRetry={reset}
      />
    </div>
  );
}
