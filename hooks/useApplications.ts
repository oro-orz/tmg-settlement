"use client";

import { useState, useEffect } from "react";
import { Application } from "@/lib/types";
import { getApplications } from "@/lib/gasApi";

export function useApplications(targetMonth: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getApplications(targetMonth);
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [targetMonth]);

  return {
    applications,
    isLoading,
    error,
    refetch: fetchApplications,
  };
}
