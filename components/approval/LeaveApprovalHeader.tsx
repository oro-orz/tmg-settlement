"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { getMonthOptions } from "@/lib/utils";
import { LeaveApplicationItem } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faBuildingUser,
  faClipboardCheck,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

interface LeaveApprovalHeaderProps {
  targetMonth: string;
  onMonthChange: (month: string) => void;
  applications: LeaveApplicationItem[];
}

function countByStatus(applications: LeaveApplicationItem[]) {
  let branchPending = 0;
  let executivePending = 0;
  let hrPending = 0;
  let completed = 0;
  for (const app of applications) {
    if (app.isCancelled) continue;
    if (app.branchManagerStatus === "未承認") {
      branchPending++;
    } else if (app.executiveStatus === "未承認") {
      executivePending++;
    } else if (app.hrStatus === "未確認" || app.hrStatus === "確認済") {
      hrPending++;
    } else {
      completed++;
    }
  }
  return { branchPending, executivePending, hrPending, completed };
}

export function LeaveApprovalHeader({
  targetMonth,
  onMonthChange,
  applications,
}: LeaveApprovalHeaderProps) {
  const monthOptions = getMonthOptions(12);
  const { branchPending, executivePending, hrPending, completed } =
    countByStatus(applications);

  return (
    <header className="flex-shrink-0 border-b border-border bg-card px-6 py-4 rounded-b-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading font-semibold text-foreground">
          休暇申請承認
        </h1>

        <div className="flex items-center gap-4">
          <Select value={targetMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[160px] rounded-xl h-9">
              <SelectValue placeholder="申請月" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card className="px-4 py-2 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-5 text-body-lg">
              <span className="flex items-center gap-2 text-muted-foreground" title="拠点長未承認">
                <FontAwesomeIcon icon={faUserTie} className="text-primary" />
                <span className="font-semibold text-foreground">{branchPending}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="役員未承認">
                <FontAwesomeIcon icon={faBuildingUser} className="text-amber-600" />
                <span className="font-semibold text-foreground">{executivePending}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="総務未確認">
                <FontAwesomeIcon icon={faClipboardCheck} className="text-blue-600" />
                <span className="font-semibold text-foreground">{hrPending}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground" title="処理済">
                <FontAwesomeIcon icon={faCircleCheck} className="text-green-600" />
                <span className="font-semibold text-foreground">{completed}</span>
              </span>
            </div>
          </Card>
        </div>
      </div>
    </header>
  );
}
