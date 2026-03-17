"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faListCheck, faClipboardCheck, faTableList, faFileInvoice, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { href: "/dashboard", icon: faFileInvoice, label: "経理管理" },
  { href: "/archive", icon: faFolderOpen, label: "経理アーカイブ" },
  { href: "/leave-approval", icon: faClipboardCheck, label: "休暇申請" },
  { href: "/paid-leave", icon: faTableList, label: "有給残日数" },
  { href: "/applications", icon: faFileLines, label: "ツール申請" },
  { href: "/ai-check-jobs", icon: faListCheck, label: "AIチェック進捗" },
];

export function Sidebar() {
  return (
    <aside
      className="w-16 flex-shrink-0 bg-base flex flex-col rounded-r-xl"
      aria-label="メインナビゲーション"
    >
      <div className="p-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center h-12 w-12 rounded-xl text-base-foreground/80 hover:bg-white/10 hover:text-base-foreground transition-colors"
            title={item.label}
            aria-label={item.label}
          >
            {item.icon && <FontAwesomeIcon icon={item.icon} className="text-lg" style={{ width: "1.25rem", height: "1.25rem" }} />}
          </Link>
        ))}
      </div>
    </aside>
  );
}
