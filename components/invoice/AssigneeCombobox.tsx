"use client";

import { useState, useRef, useEffect } from "react";

export interface AssigneeOption {
  accountId: string;
  accountName: string;
}

interface AssigneeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: AssigneeOption[];
  placeholder?: string;
  id?: string;
  className?: string;
}

/** 担当者入力: 入力直下にフォームと同じデザインのプルダウンを表示。候補選択または手動入力可能。 */
export function AssigneeCombobox({
  value,
  onChange,
  options,
  placeholder = "弊社担当者",
  id,
  className = "",
}: AssigneeComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim() === ""
      ? options
      : options.filter((o) =>
          o.accountName.toLowerCase().includes(value.trim().toLowerCase())
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && options.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-md"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-body text-muted-foreground">
              該当なし（そのまま入力して送信できます）
            </li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.accountId}
                role="option"
                className="cursor-pointer px-3 py-2 text-body text-foreground hover:bg-muted/60"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.accountName);
                  setOpen(false);
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
