"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCheckSubmit } from "@/hooks/useCheckSubmit";
import { Application } from "@/lib/types";
import { CheckCircle2, XCircle, UserCog } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface AccountingCheckFormProps {
  application: Application;
  onSubmitted: () => void;
}

export function AccountingCheckForm({
  application,
  onSubmitted,
}: AccountingCheckFormProps) {
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [contentChecked, setContentChecked] = useState(false);
  const [comment, setComment] = useState("");

  const { submit, isSubmitting } = useCheckSubmit();

  const canApprove = receiptChecked && contentChecked;

  const handleSubmit = async (
    action:
      | "accounting_approve"
      | "accounting_reject"
      | "send_to_executive"
  ) => {
    try {
      await submit({
        applicationId: application.applicationId,
        action,
        checker: "経理担当者",
        comment: comment || undefined,
      });

      setReceiptChecked(false);
      setContentChecked(false);
      setComment("");

      onSubmitted();
    } catch (error) {
      console.error("Check submission failed:", error);
      alert("エラーが発生しました");
    }
  };

  if (application.checkStatus !== "未確認") {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">👔 経理チェック</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">担当者:</span>
            <span className="font-medium">
              {application.accountingChecker || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">確認日:</span>
            <span className="font-medium">
              {application.accountingCheckDate || "-"}
            </span>
          </div>
          {application.accountingComment && (
            <div>
              <div className="text-gray-600 mb-1">コメント:</div>
              <div className="font-medium">
                {application.accountingComment}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">👔 経理チェック</h3>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="receipt-check"
              checked={receiptChecked}
              onCheckedChange={(checked) =>
                setReceiptChecked(checked === true)}
            />
            <label
              htmlFor="receipt-check"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              領収書を確認しました
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="content-check"
              checked={contentChecked}
              onCheckedChange={(checked) =>
                setContentChecked(checked === true)}
            />
            <label
              htmlFor="content-check"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              金額・内容が適切です
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            コメント（任意）
          </label>
          <Textarea
            placeholder="特記事項があれば入力してください..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleSubmit("accounting_approve")}
            disabled={!canApprove || isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            経理承認
          </Button>

          <Button
            onClick={() => handleSubmit("accounting_reject")}
            disabled={isSubmitting}
            variant="destructive"
            className="flex-1"
          >
            {isSubmitting ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            差し戻し
          </Button>

          <Button
            onClick={() => handleSubmit("send_to_executive")}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1"
          >
            {isSubmitting ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <UserCog className="h-4 w-4 mr-2" />
            )}
            役員へ回す
          </Button>
        </div>
      </div>
    </Card>
  );
}
