"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LeaveApprovalHeader } from "@/components/approval/LeaveApprovalHeader";
import { LeaveLeftPanel } from "@/components/approval/LeaveLeftPanel";
import { LeaveApplicationDetail } from "@/components/approval/LeaveApplicationDetail";
import { LeaveRightPanel } from "@/components/approval/LeaveRightPanel";
import { LeaveApplicationItem } from "@/lib/types";
import { getCurrentMonth } from "@/lib/constants";

/** 申請日（appliedAt）から YYYY-MM を返す */
function getApplicationMonth(item: LeaveApplicationItem): string {
  const v = item.appliedAt;
  if (v == null || v === "") return "";
  const d = new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export default function LeaveApprovalPage() {
  const [targetMonth, setTargetMonth] = useState(getCurrentMonth());
  const [list, setList] = useState<LeaveApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaveApplicationItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const activeList = list.filter(
    (r) => getApplicationMonth(r) === targetMonth
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leave-applications");
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "取得に失敗しました");
        setList([]);
        return;
      }
      const items = data.data || [];
      setList(items);
      setSelected((prev) => {
        const inMonth = items.filter(
          (r: LeaveApplicationItem) => getApplicationMonth(r) === targetMonth
        );
        if (!inMonth.length) return null;
        if (prev) {
          const next = inMonth.find(
            (r: LeaveApplicationItem) => r.rowIndex === prev.rowIndex
          );
          return next ?? inMonth[0];
        }
        return inMonth[0];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
      setList([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [targetMonth]);

  useEffect(() => {
    fetchList();
    // 初回マウント時のみ取得（一覧は全件取得し月でフィルタする）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMonthChange = (month: string) => {
    setTargetMonth(month);
    setSelected((prev) => {
      const inMonth = list.filter((r) => getApplicationMonth(r) === month);
      if (!inMonth.length) return null;
      if (prev && inMonth.some((r) => r.rowIndex === prev.rowIndex))
        return prev;
      return inMonth[0];
    });
  };

  const handleApproval = async (
    column: "branch_manager" | "executive" | "hr",
    value: string
  ) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/leave-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: selected.rowIndex,
          column,
          value,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "更新に失敗しました");
        return;
      }
      await fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!selected || selected.isCancelled) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/leave-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIndex: selected.rowIndex,
          column: "cancelled",
          value: true,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "取り消しに失敗しました");
        return;
      }
      await fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "取り消しに失敗しました");
    } finally {
      setUpdating(false);
    }
  };

  const centerContent = selected ? (
    <LeaveApplicationDetail application={selected} />
  ) : (
    <div className="flex items-center justify-center h-full min-h-[200px] text-body text-muted-foreground">
      申請を選択してください
    </div>
  );

  return (
    <AppShell
      header={
        <LeaveApprovalHeader
          targetMonth={targetMonth}
          onMonthChange={handleMonthChange}
          applications={activeList}
        />
      }
      left={
        <LeaveLeftPanel
          applications={activeList}
          selectedRowIndex={selected?.rowIndex ?? null}
          onSelect={setSelected}
          isLoading={loading}
          error={error}
        />
      }
      center={centerContent}
      right={
        <LeaveRightPanel
          application={selected}
          onApproval={handleApproval}
          onCancel={handleCancel}
          updating={updating}
        />
      }
    />
  );
}
