import { CheckStatus } from "@/lib/types";
import { CHECK_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: CheckStatus;
  className?: string;
}

const DEFAULT_STATUS_STYLE = "bg-muted text-muted-foreground border-border";

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = CHECK_STATUS_COLORS[status as keyof typeof CHECK_STATUS_COLORS] ?? DEFAULT_STATUS_STYLE;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
