"use client";

import { useState } from "react";
import { CheckSubmitPayload } from "@/lib/types";
import { submitCheck } from "@/lib/gasApi";

export function useCheckSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (payload: CheckSubmitPayload) => {
    setIsSubmitting(true);
    try {
      await submitCheck(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
  };
}
