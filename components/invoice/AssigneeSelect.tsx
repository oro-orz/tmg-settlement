"use client";

import { useState, useRef, useEffect } from "react";

export interface AssigneeOption {
  accountId: string;
  accountName: string;
}

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AssigneeOption[];
  /** 現在の値が候補にない場合（既存データ用）、先頭に追加して表示する */
  currentValueIfMissing?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 担当者選択: 入力で候補を絞り込みつつ、候補リストからのみ選択可能。
 * ・クリックでドロップダウン表示 → 一覧から選択
 * ・入力するとリストを絞り込み → 絞り込み結果から選択
 * リスト外の値は受け付けない（アップロード・編集共通）
 */
export function AssigneeSelect({
  value,
  onChange,
  options,
  currentValueIfMissing,
  placeholder = "選択してください",
  id,
  className = "",
  disabled = false,
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const optionNames = options.map((o) => o.accountName);
  const hasCurrentInList =
    currentValueIfMissing != null &&
    currentValueIfMissing.trim() !== "" &&
    optionNames.includes(currentValueIfMissing.trim());
  const optionsWithCurrent =
    currentValueIfMissing != null &&
    currentValueIfMissing.trim() !== "" &&
    !hasCurrentInList
      ? [{ accountId: "_current", accountName: currentValueIfMissing.trim() }, ...options]
      : options;

  const filtered =
    filterText.trim() === ""
      ? optionsWithCurrent
      : optionsWithCurrent.filter((o) =>
          o.accountName.toLowerCase().includes(filterText.trim().toLowerCase())
        );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = open ? filterText : value;
  const showPlaceholder = !open && !value && placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setFilterText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setFilterText(value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={showPlaceholder ? placeholder : undefined}
        autoComplete="off"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50"
      />
      {open && (
        <ul
          className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-md"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-body text-muted-foreground">
              該当する候補がありません
            </li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.accountId}
                role="option"
                aria-selected={value === o.accountName}
                className="cursor-pointer px-3 py-2 text-body text-foreground hover:bg-muted/60"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.accountName);
                  setOpen(false);
                  setFilterText("");
                }}
              >
                {o.accountName}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
