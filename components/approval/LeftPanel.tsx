"use client";

import { useState } from "react";
import { ApplicationList } from "./ApplicationList";
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
import { Application, FilterOptions } from "@/lib/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";

interface LeftPanelProps {
  applications: Application[];
  selectedId: string | null;
  onSelect: (app: Application) => void;
  isLoading: boolean;
  error: Error | null;
}

export function LeftPanel({
  applications,
  selectedId,
  onSelect,
  isLoading,
  error,
}: LeftPanelProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    checkStatus: "all",
  });

  const filteredApplications = applications.filter((app) => {
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (
        !app.employeeName.toLowerCase().includes(query) &&
        !app.tool.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (
      filters.checkStatus !== "all" &&
      app.checkStatus !== filters.checkStatus
    ) {
      return false;
    }

    return true;
  });

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
          description={error.message}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-title font-semibold text-foreground mb-3">
          申請一覧 ({filteredApplications.length})
        </h2>

        <div className="relative mb-3">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="社員名・ツール名で検索..."
            value={filters.searchQuery ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, searchQuery: e.target.value })
            }
            className="pl-10 rounded-xl"
          />
        </div>

        <Select
          value={filters.checkStatus ?? "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              checkStatus: value as FilterOptions["checkStatus"],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="未確認">未確認</SelectItem>
            <SelectItem value="経理承認済">経理承認済</SelectItem>
            <SelectItem value="差し戻し">差し戻し</SelectItem>
            <SelectItem value="役員確認待ち">役員確認待ち</SelectItem>
            <SelectItem value="最終承認済">最終承認済</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredApplications.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="申請がありません"
              description="この条件に一致する申請は見つかりませんでした"
            />
          </div>
        ) : (
          <ApplicationList
            applications={filteredApplications}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}
