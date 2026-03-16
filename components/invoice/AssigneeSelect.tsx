"use client";

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

/** 担当者選択: 候補リストからのみ選択可能（リスト外は受け付けない）。アップロード・編集共通。 */
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
  const optionNames = options.map((o) => o.accountName);
  const hasCurrentInList = currentValueIfMissing != null && currentValueIfMissing.trim() !== "" && optionNames.includes(currentValueIfMissing.trim());
  const optionsWithCurrent =
    currentValueIfMissing != null && currentValueIfMissing.trim() !== "" && !hasCurrentInList
      ? [{ accountId: "_current", accountName: currentValueIfMissing.trim() }, ...options]
      : options;

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 ${className}`}
    >
      <option value="">{placeholder}</option>
      {optionsWithCurrent.map((o) => (
        <option key={o.accountId} value={o.accountName}>
          {o.accountName}
        </option>
      ))}
    </select>
  );
}
