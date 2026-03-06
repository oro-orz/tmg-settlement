"use client";

import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "実行",
  cancelLabel = "キャンセル",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => !isLoading && onCancel()}
    >
      <div
        className="rounded-xl border border-border bg-card shadow-lg max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-body text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-xl"
          >
            {isLoading ? "処理中…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
