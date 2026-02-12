"use client";

import { LeaveApplicationItem } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faUser,
  faUmbrellaBeach,
  faCalendarDays,
  faHashtag,
  faClock,
  faFileLines,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";

function formatDateStr(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const d = new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface LeaveApplicationDetailProps {
  application: LeaveApplicationItem;
}

export function LeaveApplicationDetail({
  application,
}: LeaveApplicationDetailProps) {
  const gridItem = (
    icon: React.ReactNode,
    label: string,
    value: React.ReactNode,
    span2?: boolean
  ) => (
    <div
      key={label}
      className={`flex items-start gap-2 ${span2 ? "col-span-2" : ""}`}
    >
      <span className="text-muted-foreground flex-shrink-0 w-4 flex justify-center mt-0.5">
        {icon}
      </span>
      <span className="text-muted-foreground text-body-lg flex-shrink-0">
        {label}
      </span>
      <span className="font-medium text-foreground min-w-0">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col min-h-0 h-full rounded-2xl border border-border overflow-hidden bg-card">
      <div className="p-6 flex flex-col gap-6 min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-body-lg pr-2">
            {gridItem(
              <FontAwesomeIcon icon={faCalendar} className="w-4" />,
              "申請日",
              application.appliedAt
                ? formatDateStr(application.appliedAt as string)
                : "—"
            )}
            {gridItem(
              <FontAwesomeIcon icon={faUser} className="w-4" />,
              "氏名",
              application.employeeName
            )}
            {gridItem(
              <FontAwesomeIcon icon={faUmbrellaBeach} className="w-4" />,
              "申請種別",
              application.requestType
            )}
            {gridItem(
              <FontAwesomeIcon icon={faCalendarDays} className="w-4" />,
              "期間",
              `${formatDateStr(application.startDate)} ～ ${formatDateStr(application.endDate)}`
            )}
            {gridItem(
              <FontAwesomeIcon icon={faHashtag} className="w-4" />,
              "日数",
              `${application.days} 日`
            )}
            {application.timeValue
              ? gridItem(
                  <FontAwesomeIcon icon={faClock} className="w-4" />,
                  "時刻",
                  application.timeValue
                )
              : null}
            {gridItem(
              <FontAwesomeIcon icon={faFileLines} className="w-4" />,
              "理由",
              <span className="whitespace-pre-wrap break-words">
                {application.reason || "—"}
              </span>,
              true
            )}
            {application.attachmentUrl
              ? gridItem(
                  <FontAwesomeIcon icon={faPaperclip} className="w-4" />,
                  "添付",
                  <a
                    href={application.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    添付ファイルを開く
                  </a>
                )
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
