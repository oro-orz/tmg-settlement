"use client";

import { useState } from "react";
import { LeaveApplicationItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandPointer,
  faUserTie,
  faBuildingUser,
  faClipboardCheck,
  faPaperclip,
  faCircleCheck,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  未承認: "未承認",
  承認: "承認済",
  未確認: "未確認",
  確認済: "確認済",
  処理済: "処理済",
};

const STATUS_STYLE: Record<string, string> = {
  未承認: "bg-gray-100 text-gray-800 border-gray-300",
  承認: "bg-green-100 text-green-800 border-green-300",
  未確認: "bg-amber-100 text-amber-800 border-amber-300",
  確認済: "bg-blue-100 text-blue-800 border-blue-300",
  処理済: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

/** 全体ステータス（未承認 or 処理済み or 取り消し済）の表示用スタイル（AIツール申請と同様） */
const OVERALL_STATUS_STYLE = {
  未承認: "bg-gray-100 text-gray-800 border-gray-300",
  処理済み: "bg-emerald-100 text-emerald-800 border-emerald-300",
  取り消し済: "bg-gray-200 text-gray-600 border-gray-400",
} as const;

/** 拠点長・役員・総務の識別色（未対応時の枠・背景） */
const ROLE_PENDING_STYLE = {
  branch_manager: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  executive: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
  hr: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
} as const;

interface LeaveRightPanelProps {
  application: LeaveApplicationItem | null;
  onApproval: (
    column: "branch_manager" | "executive" | "hr",
    value: string
  ) => Promise<void>;
  onCancel?: () => Promise<void>;
  updating: boolean;
}

const IMAGE_AREA_MIN_HEIGHT = "min-h-[280px]";

export function LeaveRightPanel({
  application,
  onApproval,
  onCancel,
  updating,
}: LeaveRightPanelProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const handleCancelConfirm = async () => {
    if (!onCancel) return;
    await onCancel();
    setCancelModalOpen(false);
  };

  if (!application) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className={cn(
            "flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl m-4 bg-muted/20",
            IMAGE_AREA_MIN_HEIGHT
          )}
        >
          <EmptyState
            iconNode={
              <FontAwesomeIcon
                icon={faHandPointer}
                className="text-4xl text-muted-foreground"
              />
            }
            title="申請を選択"
            description="左の一覧から申請を選んでください"
          />
        </div>
        <div className="flex-shrink-0 border-t border-border bg-card" />
      </div>
    );
  }

  const branchStyle =
    STATUS_STYLE[application.branchManagerStatus] ?? "bg-muted text-muted-foreground border-border";
  const executiveStyle =
    STATUS_STYLE[application.executiveStatus] ?? "bg-muted text-muted-foreground border-border";
  const hrStyle =
    STATUS_STYLE[application.hrStatus] ?? "bg-muted text-muted-foreground border-border";

  const overallStatus = application.isCancelled
    ? "取り消し済"
    : application.hrStatus === "処理済"
      ? "処理済み"
      : "未承認";
  const overallStatusClass =
    OVERALL_STATUS_STYLE[overallStatus as keyof typeof OVERALL_STATUS_STYLE] ??
    OVERALL_STATUS_STYLE.未承認;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 右上: 全体ステータス（AIツール申請と同様の1行表示） */}
      <div
        className={cn(
          "flex-shrink-0 p-4 rounded-xl text-center mx-4 mt-4 mb-2 border text-xl font-semibold",
          overallStatusClass
        )}
      >
        {overallStatus}
      </div>

      {/* 添付資料 */}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto border-t border-border bg-card",
          IMAGE_AREA_MIN_HEIGHT
        )}
      >
        <div className="p-4">
          {application.attachmentUrl ? (
            <a
              href={application.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-body text-primary hover:underline"
            >
              <FontAwesomeIcon icon={faPaperclip} />
              添付ファイルを開く
            </a>
          ) : (
            <p className="text-body text-muted-foreground">
              添付資料はありません
            </p>
          )}
        </div>
      </div>

      {/* 右下: 承認エリア（取り消し済は説明のみ） */}
      <div className="flex-shrink-0 border-t border-border bg-card sticky bottom-0">
        <div className="p-4">
          <h3 className="text-body font-semibold text-foreground mb-4">
            承認
          </h3>
          {application.isCancelled ? (
            <p className="text-body text-muted-foreground">
              この申請は取り消し済みです
            </p>
          ) : (
          <div className="space-y-3">
            {/* 拠点長（青） */}
            <div
              className={cn(
                "rounded-xl border-2 p-3 transition-colors",
                application.branchManagerStatus === "未承認"
                  ? ROLE_PENDING_STYLE.branch_manager
                  : "border-border bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    "text-caption font-medium",
                    application.branchManagerStatus === "未承認"
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-muted-foreground"
                  )}
                >
                  拠点長
                </span>
                {application.branchManagerStatus !== "未承認" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                      branchStyle
                    )}
                  >
                    <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                    {STATUS_LABELS[application.branchManagerStatus] ??
                      application.branchManagerStatus}
                  </span>
                )}
              </div>
              {application.branchManagerStatus === "未承認" ? (
                <Button
                  onClick={() => onApproval("branch_manager", "承認")}
                  disabled={updating}
                  className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  <FontAwesomeIcon icon={faUserTie} className="mr-2" />
                  承認する
                </Button>
              ) : null}
            </div>

            {/* 役員（紫） */}
            <div
              className={cn(
                "rounded-xl border-2 p-3 transition-colors",
                application.executiveStatus === "未承認"
                  ? ROLE_PENDING_STYLE.executive
                  : "border-border bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    "text-caption font-medium",
                    application.executiveStatus === "未承認"
                      ? "text-violet-700 dark:text-violet-400"
                      : "text-muted-foreground"
                  )}
                >
                  役員
                </span>
                {application.executiveStatus !== "未承認" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                      executiveStyle
                    )}
                  >
                    <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                    {STATUS_LABELS[application.executiveStatus] ??
                      application.executiveStatus}
                  </span>
                )}
              </div>
              {application.executiveStatus === "未承認" ? (
                <Button
                  onClick={() => onApproval("executive", "承認")}
                  disabled={updating}
                  className="w-full h-11 font-semibold bg-violet-600 hover:bg-violet-700"
                >
                  <FontAwesomeIcon icon={faBuildingUser} className="mr-2" />
                  承認する
                </Button>
              ) : null}
            </div>

            {/* 総務（緑） */}
            <div
              className={cn(
                "rounded-xl border-2 p-3 transition-colors",
                application.hrStatus === "未確認" ||
                  application.hrStatus === "確認済"
                  ? ROLE_PENDING_STYLE.hr
                  : "border-border bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    "text-caption font-medium",
                    application.hrStatus === "未確認" ||
                      application.hrStatus === "確認済"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  総務
                </span>
                {application.hrStatus !== "未確認" &&
                  application.hrStatus !== "確認済" && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                        hrStyle
                      )}
                    >
                      <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                      {STATUS_LABELS[application.hrStatus] ?? application.hrStatus}
                    </span>
                  )}
              </div>
              {application.hrStatus === "未確認" ? (
                <Button
                  onClick={() => onApproval("hr", "確認済")}
                  disabled={updating}
                  className="w-full h-11 font-semibold bg-emerald-600 hover:bg-emerald-700"
                >
                  <FontAwesomeIcon icon={faClipboardCheck} className="mr-2" />
                  確認済みにする（有給減少）
                </Button>
              ) : null}
            </div>

            {/* 取り消し（総務ボタンの下） */}
            {onCancel && !application.isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
                disabled={updating}
                className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="この申請を取り消す"
              >
                <FontAwesomeIcon icon={faBan} className="mr-2" />
                取り消し
              </Button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* 取り消し確認モーダル */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h2
              id="cancel-modal-title"
              className="text-body font-semibold text-foreground mb-3"
            >
              申請の取り消し
            </h2>
            <p className="text-body text-foreground mb-6">
              申請を取消します。従業員は再度申請を行う必要があります、実行しますか？
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                disabled={updating}
              >
                閉じる
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={updating}
              >
                実行する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
