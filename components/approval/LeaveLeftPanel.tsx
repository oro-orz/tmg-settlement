"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { LeaveApplicationItem } from "@/lib/types";
import {
  LeaveApplicationListItem,
  getLeaveFlowStatus,
  LeaveFlowStatus,
} from "./LeaveApplicationListItem";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";

const FLOW_SORT_ORDER: Record<LeaveFlowStatus, number> = {
  拠点長未承認: 0,
  役員未承認: 1,
  総務未確認: 2,
  処理済: 3,
  取り消し: 4,
};

interface LeaveLeftPanelProps {
  applications: LeaveApplicationItem[];
  selectedRowIndex: number | null;
  onSelect: (app: LeaveApplicationItem) => void;
  isLoading: boolean;
  error: string | null;
}

export function LeaveLeftPanel({
  applications,
  selectedRowIndex,
  onSelect,
  isLoading,
  error,
}: LeaveLeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"dateDesc" | "dateAsc">("dateDesc");

  const filteredAndSorted = useMemo(() => {
    let list = [...applications];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          String(r.employeeName).toLowerCase().includes(q) ||
          String(r.requestType).toLowerCase().includes(q) ||
          String(r.employeeNumber).toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => getLeaveFlowStatus(r) === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const statusOrder =
        FLOW_SORT_ORDER[getLeaveFlowStatus(a)] -
        FLOW_SORT_ORDER[getLeaveFlowStatus(b)];
      if (statusOrder !== 0) return statusOrder;
      const dateA = new Date((a.appliedAt as string) || 0).getTime();
      const dateB = new Date((b.appliedAt as string) || 0).getTime();
      return sortOrder === "dateDesc" ? dateB - dateA : dateA - dateB;
    });
    return list;
  }, [applications, searchQuery, statusFilter, sortOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          title="エラーが発生しました"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-title font-semibold text-foreground mb-3">
          申請一覧 ({filteredAndSorted.length})
        </h2>

        <div className="relative mb-3">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="社員名・申請種別で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              <SelectItem value="拠点長未承認">拠点長未承認</SelectItem>
              <SelectItem value="役員未承認">役員未承認</SelectItem>
              <SelectItem value="総務未確認">総務未確認</SelectItem>
              <SelectItem value="処理済">処理済</SelectItem>
              <SelectItem value="取り消し">取り消し</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as "dateDesc" | "dateAsc")}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="並び順" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateDesc">申請日 新しい順</SelectItem>
              <SelectItem value="dateAsc">申請日 古い順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="申請がありません"
              description="この条件に一致する申請は見つかりませんでした"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAndSorted.map((app) => (
              <LeaveApplicationListItem
                key={app.rowIndex}
                application={app}
                isSelected={app.rowIndex === selectedRowIndex}
                onClick={() => onSelect(app)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
