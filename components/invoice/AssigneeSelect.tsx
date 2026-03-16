"use client";

import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";

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

/** ドロップダウン用 z-index（他要素より前面に表示） */
const DROPDOWN_Z = 50;

/**
 * 担当者選択: 入力で候補を絞り込みつつ、候補リストからのみ選択可能。
 * ・クリックでドロップダウン表示 → 一覧から選択
 * ・入力するとリストを絞り込み → 絞り込み結果から選択
 * リスト外の値は受け付けない（アップロード・編集共通）
 * ドロップダウンは Portal で body 直下に fixed 表示し、親の overflow で切れないようにする。
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
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

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

  /** ドロップダウンを入力の直下に表示するための位置を計測（fixed はビューポート基準） */
  const updateDropdownRect = () => {
    const el = inputRef.current ?? containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (open) {
      updateDropdownRect();
    } else {
      setDropdownRect(null);
    }
  }, [open, filterText, optionsWithCurrent.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const list = document.querySelector(`[data-assignee-select-id="${listId}"]`);
      if (list?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [listId]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      updateDropdownRect();
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const displayValue = open ? filterText : value;
  const showPlaceholder = !open && !value && placeholder;

  const dropdownList = open && dropdownRect && typeof document !== "undefined" && (
    <ul
      data-assignee-select-id={listId}
      role="listbox"
      className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-md"
      style={{
        position: "fixed",
        top: dropdownRect.top,
        left: dropdownRect.left,
        width: dropdownRect.width,
        zIndex: DROPDOWN_Z,
      }}
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
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
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
        aria-readonly={false}
        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50"
      />
      {typeof document !== "undefined" && dropdownList && createPortal(dropdownList, document.body)}
    </div>
  );
}
