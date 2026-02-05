"use client";

import { useState } from "react";
import { useApplications } from "@/hooks/useApplications";
import { getMonthOptions } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationList } from "@/components/approval/ApplicationList";
import { EmptyState } from "@/components/shared/EmptyState";
import { SimpleShell } from "@/components/layout/SimpleShell";

export default function ArchivePage() {
  const monthOptions = getMonthOptions(24);
  const [targetMonth, setTargetMonth] = useState(monthOptions[0]?.value ?? "");

  const { applications, isLoading, error } = useApplications(targetMonth);

  return (
    <SimpleShell title="アーカイブ">
      <div className="p-6">
        <div className="mb-4 max-w-xs">
          <Select
            value={targetMonth}
            onValueChange={setTargetMonth}
            disabled={!monthOptions.length}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="対象月" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <EmptyState
            title="エラーが発生しました"
            description={error.message}
          />
        )}

        {!error && isLoading && (
          <div className="text-body text-muted-foreground">読み込み中...</div>
        )}

        {!error && !isLoading && applications.length === 0 && (
          <EmptyState
            title="申請がありません"
            description="この月の申請はありません"
          />
        )}

        {!error && !isLoading && applications.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border font-medium text-foreground">
              {applications.length}件
            </div>
            <ApplicationList
              applications={applications}
              selectedId={null}
              onSelect={() => {}}
            />
          </div>
        )}
      </div>
    </SimpleShell>
  );
}
