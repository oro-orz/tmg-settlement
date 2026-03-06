"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import type { Invoice } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function ArchivePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("status", "approved");
    if (filterMonth) params.set("targetMonth", filterMonth);
    fetch(`/api/invoices?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInvoices(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [filterMonth]);

  const byMonth = invoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    const m = inv.targetMonth || "未設定";
    if (!acc[m]) acc[m] = [];
    acc[m].push(inv);
    return acc;
  }, {});

  const months = Object.keys(byMonth).sort();

  return (
    <AppShell
      header={
        <Header
          title="請求書アーカイブ"
          targetMonth={filterMonth}
          onMonthChange={setFilterMonth}
          applications={[]}
        />
      }
      left={
        <div className="p-4">
          <Link
            href="/dashboard"
            className="text-body text-primary hover:underline"
          >
            ← 請求書管理
          </Link>
          <div className="mt-4">
            <label className="block text-caption text-muted-foreground mb-1">対象月で絞り込み</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body"
            />
          </div>
        </div>
      }
      center={
        <div className="p-4">
          <h1 className="text-xl font-bold text-foreground mb-4">承認済み請求書アーカイブ</h1>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : months.length === 0 ? (
            <p className="text-body text-muted-foreground">承認済みの請求書はまだありません</p>
          ) : (
            <div className="space-y-6">
              {months.map((month) => (
                <div key={month} className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-body font-semibold text-foreground mb-3">{month}</h2>
                  <ul className="space-y-2">
                    {byMonth[month].map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between">
                        <span className="text-body">{inv.vendorName}</span>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-body text-primary hover:underline"
                        >
                          印刷・共有
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      }
      right={<div className="p-4 text-body text-muted-foreground text-caption">日付・取引先別に表示しています。</div>}
    />
  );
}
