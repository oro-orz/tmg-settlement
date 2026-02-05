"use client";

import { Application } from "@/lib/types";
import { AIRiskBadge } from "@/components/shared/AIRiskBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ApplicationListItemProps {
  application: Application;
  isSelected: boolean;
  onClick: () => void;
}

export function ApplicationListItem({
  application,
  isSelected,
  onClick,
}: ApplicationListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 transition-colors border-l-2 border-transparent",
        isSelected
          ? "bg-primary/10 border-primary"
          : "hover:bg-muted/50 border-transparent"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold text-foreground truncate min-w-0">
          {application.employeeName}
        </span>
        {application.aiRiskLevel && (
          <AIRiskBadge riskLevel={application.aiRiskLevel} compact className="bg-white" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5 text-caption">
        <span className="text-foreground truncate min-w-0">{application.tool}</span>
        <StatusBadge status={application.checkStatus} />
      </div>
      <div className="mt-1 font-semibold text-primary text-body">
        {formatCurrency(application.amount)}
      </div>
    </button>
  );
}
