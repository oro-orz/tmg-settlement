"use client";

import { LeaveApplicationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LeaveFlowStatus =
  | "拠点長未承認"
  | "役員未承認"
  | "総務未確認"
  | "処理済"
  | "取り消し";

export function getLeaveFlowStatus(item: LeaveApplicationItem): LeaveFlowStatus {
  if (item.isCancelled) return "取り消し";
  if (item.branchManagerStatus === "未承認") return "拠点長未承認";
  if (item.executiveStatus === "未承認") return "役員未承認";
  if (item.hrStatus === "未確認" || item.hrStatus === "確認済") return "総務未確認";
  return "処理済";
}

const FLOW_STATUS_COLORS: Record<LeaveFlowStatus, string> = {
  拠点長未承認: "bg-gray-100 text-gray-800 border-gray-300",
  役員未承認: "bg-amber-100 text-amber-800 border-amber-300",
  総務未確認: "bg-blue-100 text-blue-800 border-blue-300",
  処理済: "bg-emerald-100 text-emerald-800 border-emerald-300",
  取り消し: "bg-gray-200 text-gray-600 border-gray-400",
};

function formatDateStr(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const d = new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  });
}

interface LeaveApplicationListItemProps {
  application: LeaveApplicationItem;
  isSelected: boolean;
  onClick: () => void;
}

export function LeaveApplicationListItem({
  application,
  isSelected,
  onClick,
}: LeaveApplicationListItemProps) {
  const flowStatus = getLeaveFlowStatus(application);
  const style = FLOW_STATUS_COLORS[flowStatus];

  const isCancelled = application.isCancelled;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 transition-colors border-l-2 border-transparent",
        isSelected
          ? "bg-primary/10 border-primary"
          : "hover:bg-muted/50 border-transparent",
        isCancelled && "opacity-75"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-body font-semibold truncate min-w-0",
            isCancelled ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {application.employeeName}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
            style
          )}
        >
          {flowStatus}
        </span>
      </div>
      <div className="mt-0.5 text-caption text-muted-foreground truncate">
        {formatDateStr(application.startDate)}～{formatDateStr(application.endDate)}
        （{application.days}日）
      </div>
      <div className="mt-1 font-semibold text-body text-primary truncate">
        {application.requestType}
      </div>
    </button>
  );
}
