"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCheckSubmit } from "@/hooks/useCheckSubmit";
import { Application } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface ExecutiveCheckFormProps {
  application: Application;
  onSubmitted: () => void;
}

export function ExecutiveCheckForm({
  application,
  onSubmitted,
}: ExecutiveCheckFormProps) {
  const [comment, setComment] = useState("");
  const { submit, isSubmitting } = useCheckSubmit();

  const handleSubmit = async (
    action: "executive_approve" | "executive_reject"
  ) => {
    try {
      await submit({
        applicationId: application.applicationId,
        action,
        checker: "役員",
        comment: comment || undefined,
      });

      setComment("");
      onSubmitted();
    } catch (error) {
      console.error("Executive check failed:", error);
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-2 text-blue-900">
          👔 経理からの依頼
        </h3>
        <div className="text-sm text-blue-800">
          <div className="mb-2">
            <span className="font-medium">担当者:</span>{" "}
            {application.accountingChecker}
          </div>
          <div>
            <span className="font-medium">コメント:</span>
          </div>
          <div className="mt-1 bg-white rounded p-3">
            {application.accountingComment || "（コメントなし）"}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">👑 役員確認</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              コメント（任意）
            </label>
            <Textarea
              placeholder="判断理由や補足事項があれば入力してください..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleSubmit("executive_approve")}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <LoadingSpinner className="mr-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              最終承認
            </Button>

            <Button
              onClick={() => handleSubmit("executive_reject")}
              disabled={isSubmitting}
              variant="destructive"
              className="flex-1"
            >
              {isSubmitting ? (
                <LoadingSpinner className="mr-2 h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              却下
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
