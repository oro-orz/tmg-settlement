-- 承認履歴・コメント用テーブル（スプシには書き戻さない。経理・役員の意思疎通用）
create table if not exists public.approval_history (
  id uuid primary key default gen_random_uuid(),
  application_id text not null,
  action text not null check (action in (
    'accounting_approve',
    'accounting_reject',
    'send_to_executive',
    'executive_approve',
    'executive_reject'
  )),
  checker text not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_history_application_id
  on public.approval_history (application_id);

-- MVP では RLS なし（サーバーから service_role でアクセス）
-- 後から Firebase 認証を入れる場合は RLS で制限可能
