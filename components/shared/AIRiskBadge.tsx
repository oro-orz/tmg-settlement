"use client";

import { AIRiskLevel } from "@/lib/types";
import { AI_RISK_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";

const AI_RISK_ICONS = {
  OK: faCircleCheck,
  WARNING: faTriangleExclamation,
  ERROR: faCircleXmark,
} as const;

interface AIRiskBadgeProps {
  riskLevel: AIRiskLevel;
  compact?: boolean;
  className?: string;
}

export function AIRiskBadge({
  riskLevel,
  compact = false,
  className,
}: AIRiskBadgeProps) {
  const icon = AI_RISK_ICONS[riskLevel];
  const label = riskLevel === "OK" ? "OK" : riskLevel === "ERROR" ? "NG" : "要確認";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border",
        AI_RISK_COLORS[riskLevel],
        className
      )}
    >
      <FontAwesomeIcon icon={icon} className="text-xs" />
      {!compact && <span>{label}</span>}
    </span>
  );
}
