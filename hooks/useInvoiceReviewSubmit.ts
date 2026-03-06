"use client";

import { useState } from "react";
import type { InvoiceReviewPayload } from "@/lib/types";

async function submitInvoiceReview(payload: InvoiceReviewPayload): Promise<void> {
  const res = await fetch(`/api/invoices/${payload.invoiceId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: payload.action,
      reviewer: payload.reviewer,
      comment: payload.comment,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? "送信に失敗しました");
  }
}

export function useInvoiceReviewSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (payload: InvoiceReviewPayload) => {
    setIsSubmitting(true);
    try {
      await submitInvoiceReview(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
  };
}
