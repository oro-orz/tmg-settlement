"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInvoiceReviewSubmit } from "@/hooks/useInvoiceReviewSubmit";
import type { Invoice } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faBan } from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface InvoiceApprovalAreaProps {
  invoice: Invoice;
  onSubmitted: () => void;
  /** 承認・差し戻しが可能か（役員・経理のみ true）。未指定時は true（従来どおり表示） */
  canApproveInvoice?: boolean;
}

export function InvoiceApprovalArea({ invoice, onSubmitted, canApproveInvoice = true }: InvoiceApprovalAreaProps) {
  const [comment, setComment] = useState("");
  const { submit, isSubmitting } = useInvoiceReviewSubmit();

  const isReadOnly =
    invoice.status === "approved" || invoice.status === "returned";

  const handleReview = async (action: "approve" | "reject") => {
    try {
      await submit({
        invoiceId: invoice.id,
        action,
        reviewer: "経理担当者",
        comment: comment || undefined,
      });
      setComment("");
      onSubmitted();
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  if (isReadOnly) {
    return (
      <div className="p-4 space-y-3 text-body text-muted-foreground">
        {invoice.status === "returned" && (
          <p className="text-caption font-medium text-foreground">差し戻し理由</p>
        )}
        {invoice.reviewerComment ? (
          <p className="pt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-foreground">{invoice.reviewerComment}</p>
        ) : invoice.status === "returned" ? (
          <p className="text-caption">理由は記録されていません</p>
        ) : null}
      </div>
    );
  }

  if (invoice.status !== "submitted") {
    return (
      <div className="p-4 text-body text-muted-foreground">
        経理提出済みの申請のみ承認・差し戻しできます。
      </div>
    );
  }

  if (!canApproveInvoice) {
    return (
      <div className="p-4 text-body text-muted-foreground">
        経理提出済みの申請のみ承認・差し戻しできます。
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="space-y-1.5">
        <label className="text-caption text-muted-foreground block">
          差し戻し理由
        </label>
        <Textarea
          placeholder="コメントを入力してください"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => handleReview("approve")}
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <>
              <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
              承認
            </>
          )}
        </Button>
        <Button
          onClick={() => handleReview("reject")}
          disabled={isSubmitting}
          variant="destructive"
          className="flex-1 rounded-xl"
        >
          {isSubmitting ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <>
              <FontAwesomeIcon icon={faBan} className="mr-2" />
              差し戻し
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
