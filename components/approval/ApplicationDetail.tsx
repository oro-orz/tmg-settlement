"use client";

import React from "react";
import { Application } from "@/lib/types";
import { AICheckSection } from "./AICheckSection";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faUser,
  faLocationDot,
  faWrench,
  faYenSign,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";

interface ApplicationDetailProps {
  application: Application;
  aiCheckLoading?: boolean;
}

/** テキスト内のURLをハイパーリンクに変換 */
function PurposeWithLinks({ text }: { text: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
}

export function ApplicationDetail(props: ApplicationDetailProps) {
  const { application, aiCheckLoading = false } = props;
  const rootClass =
    "flex flex-col min-h-0 h-full rounded-2xl border border-border overflow-hidden bg-card";
  return React.createElement(
    "div",
    { className: rootClass },
    React.createElement(
      "div",
      { className: "p-6 flex flex-col gap-6 min-h-0 flex-1 overflow-hidden" },
      React.createElement(
        "div",
        { className: "flex-1 min-h-0 overflow-y-auto" },
        React.createElement(
          "div",
          { className: "grid grid-cols-2 gap-x-6 gap-y-4 text-body-lg pr-2" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(FontAwesomeIcon, { icon: faCalendar, className: "w-4 text-muted-foreground flex-shrink-0" }),
            React.createElement("span", { className: "text-muted-foreground" }, "申請日"),
            React.createElement("span", { className: "font-medium" }, formatDate(application.applicationDate))
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(FontAwesomeIcon, { icon: faUser, className: "w-4 text-muted-foreground flex-shrink-0" }),
            React.createElement("span", { className: "text-muted-foreground" }, "スタッフ"),
            React.createElement("span", { className: "font-semibold text-foreground" }, application.employeeName)
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(FontAwesomeIcon, { icon: faLocationDot, className: "w-4 text-muted-foreground flex-shrink-0" }),
            React.createElement("span", { className: "text-muted-foreground" }, "拠点"),
            React.createElement("span", { className: "font-medium" }, application.location)
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(FontAwesomeIcon, { icon: faWrench, className: "w-4 text-muted-foreground flex-shrink-0" }),
            React.createElement("span", { className: "text-muted-foreground" }, "ツール"),
            React.createElement("span", { className: "font-semibold text-foreground" }, application.tool)
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(FontAwesomeIcon, { icon: faYenSign, className: "w-4 text-muted-foreground flex-shrink-0" }),
            React.createElement("span", { className: "text-muted-foreground" }, "金額"),
            React.createElement("span", { className: "font-semibold text-primary" }, formatCurrency(application.amount))
          ),
          application.supervisor &&
            React.createElement("div", { className: "col-span-2 flex items-center gap-2 text-body-lg" },
              React.createElement("span", { className: "text-muted-foreground" }, "上長"),
              React.createElement("span", null, application.supervisor)
            ),
          React.createElement("div", { className: "col-span-2 flex items-start gap-2 text-body" },
            React.createElement(FontAwesomeIcon, { icon: faFileLines, className: "w-4 text-muted-foreground flex-shrink-0 mt-0.5" }),
            React.createElement("div", { className: "min-w-0 flex-1" },
              React.createElement("span", { className: "text-muted-foreground block text-caption" }, "使用目的"),
              React.createElement("span", { className: "font-medium break-words", title: application.purpose || undefined },
                React.createElement(PurposeWithLinks, { text: application.purpose })
              )
            )
          )
        )
      ),
      React.createElement(
        "div",
        { className: "flex-shrink-0 min-h-[120px] pt-2" },
        aiCheckLoading || application.aiCheckResult
          ? React.createElement(AICheckSection, {
              result: application.aiCheckResult,
              isLoading: aiCheckLoading,
            })
          : React.createElement("div", {
              className: "p-4 rounded-xl border border-dashed border-border bg-muted/30 text-body text-muted-foreground",
            }, "AIチェック結果はここに表示されます")
      )
    )
  );
}
