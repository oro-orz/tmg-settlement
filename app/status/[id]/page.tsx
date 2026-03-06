"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  ai_checking: "AI確認中",
  needs_fix: "要修正",
  ai_ok: "AI確認済み",
  submitted: "経理提出済み",
  returned: "差し戻し",
  approved: "承認・格納完了",
};

interface StatusData {
  id: string;
  submitterName: string;
  vendorName: string;
  targetMonth: string;
  status: string;
  reviewerComment: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
}

export default function StatusPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/invoices/status/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.message ?? "取得に失敗しました");
        }
      })
      .catch(() => setError("通信エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-body text-muted-foreground">URLが不正です</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-body text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-body text-destructive">{error ?? "データがありません"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">請求書の提出状況</h1>
        <p className="text-body text-muted-foreground mb-8">
          取引先はこのページで進捗を確認できます。差し戻しの場合は理由を確認のうえ、再度アップロード画面から提出してください。
        </p>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <span className="text-caption text-muted-foreground">取引先名</span>
            <p className="text-body font-medium">{data.vendorName}</p>
          </div>
          <div>
            <span className="text-caption text-muted-foreground">担当者名</span>
            <p className="text-body font-medium">{data.submitterName}</p>
          </div>
          <div>
            <span className="text-caption text-muted-foreground">対象年月</span>
            <p className="text-body font-medium">{data.targetMonth}</p>
          </div>
          <div>
            <span className="text-caption text-muted-foreground">ステータス</span>
            <p className="text-body font-medium">{STATUS_LABEL[data.status] ?? data.status}</p>
          </div>
          {data.reviewerComment && (
            <div>
              <span className="text-caption text-muted-foreground">差し戻し理由（経理からのコメント）</span>
              <p className="text-body mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3">
                {data.reviewerComment}
              </p>
            </div>
          )}
          {data.approvedAt && (
            <div>
              <span className="text-caption text-muted-foreground">承認日時</span>
              <p className="text-body">{new Date(data.approvedAt).toLocaleString("ja-JP")}</p>
            </div>
          )}
        </div>

        {data.status === "returned" && (
          <div className="mt-6">
            <a
              href="/upload"
              className="inline-block rounded-xl bg-primary text-primary-foreground px-4 py-2 text-body"
            >
              再提出はこちら（アップロード画面）
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
