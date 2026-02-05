"use client";

import { Application } from "@/lib/types";
import { ReceiptViewer } from "./ReceiptViewer";
import { ApprovalArea } from "./ApprovalArea";
import { EmptyState } from "@/components/shared/EmptyState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandPointer } from "@fortawesome/free-solid-svg-icons";
import { CHECK_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  application: Application | undefined;
  onCheckSubmitted: () => void;
}

const IMAGE_AREA_MIN_HEIGHT = "min-h-[420px]";

export function RightPanel({
  application,
  onCheckSubmitted,
}: RightPanelProps) {
  if (!application) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className={cn("flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl m-4 bg-muted/20", IMAGE_AREA_MIN_HEIGHT)}>
          <EmptyState
            iconNode={<FontAwesomeIcon icon={faHandPointer} className="text-4xl text-muted-foreground" />}
            title="申請を選択"
            description="左の一覧から申請を選んでください"
          />
        </div>
        <div className="flex-shrink-0 border-t border-border bg-card" />
      </div>
    );
  }

  const statusClass = CHECK_STATUS_COLORS[application.checkStatus];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 p-4 border-b border-border bg-muted/30 text-center">
        <div
          className={cn(
            statusClass,
            "text-xl font-semibold py-2 px-4 rounded-xl border-0 inline-block"
          )}
        >
          {application.checkStatus}
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-y-auto p-4", IMAGE_AREA_MIN_HEIGHT)}>
        <div className={cn("rounded-xl border border-border bg-muted/20 overflow-hidden", IMAGE_AREA_MIN_HEIGHT)}>
          <ReceiptViewer
            receiptUrl={application.receiptUrl}
            creditUrl={application.creditUrl}
          />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-card sticky bottom-0">
        <ApprovalArea application={application} onSubmitted={onCheckSubmitted} />
      </div>
    </div>
  );
}
