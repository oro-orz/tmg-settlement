"use client";

import { useState, useEffect } from "react";
import { SimpleShell } from "@/components/layout/SimpleShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PaidLeaveListItem } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";

function formatDate(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaidLeavePage() {
  const [list, setList] = useState<PaidLeaveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/paid-leave-list")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          setError(data.message || "取得に失敗しました");
          setList([]);
          return;
        }
        setList(data.data || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "取得に失敗しました");
        setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SimpleShell title="有給残数一覧">
      <div className="p-6">
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-body font-semibold">従業員マスタ（有給残数）</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <p className="text-destructive text-body">{error}</p>
            ) : list.length === 0 ? (
              <div className="py-8">
                <EmptyState title="データがありません" description="有給残数データがまだありません。" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        社員番号
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        氏名
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                        有給残数（日）
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        最終更新
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row, i) => (
                      <tr key={i} className="border-b border-border/70 hover:bg-muted/30">
                        <td className="py-2 px-3">{String(row.number)}</td>
                        <td className="py-2 px-3">{row.name}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {typeof row.paidLeaveDays === "number"
                            ? row.paidLeaveDays
                            : String(row.paidLeaveDays ?? "—")}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {formatDate(row.lastUpdated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleShell>
  );
}
