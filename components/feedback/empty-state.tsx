import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "Tidak ada data",
  description = "Belum ada item yang dapat ditampilkan.",
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl bg-card/30 my-4">
      <div className="p-3 bg-muted/40 rounded-full mb-3 text-muted-foreground">
        {icon || <FolderOpen className="h-8 w-8" />}
      </div>
      <h4 className="text-base font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
