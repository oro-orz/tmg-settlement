import { Application } from "./types";

export function exportToCSV(applications: Application[]): string {
  const headers = [
    "申請ID",
    "申請日",
    "社員番号",
    "氏名",
    "拠点",
    "ツール",
    "金額",
    "対象月",
    "使用目的",
    "AI判定",
    "チェックステータス",
    "経理担当",
    "経理コメント",
    "役員",
    "役員コメント",
  ];

  const rows = applications.map((app) => [
    app.applicationId,
    app.applicationDate,
    app.employeeNumber,
    app.employeeName,
    app.location,
    app.tool,
    app.amount,
    app.targetMonth,
    `"${app.purpose.replace(/"/g, '""')}"`,
    app.aiRiskLevel || "",
    app.checkStatus,
    app.accountingChecker || "",
    `"${(app.accountingComment || "").replace(/"/g, '""')}"`,
    app.executiveApprover || "",
    `"${(app.executiveComment || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return "\uFEFF" + csvContent;
}
