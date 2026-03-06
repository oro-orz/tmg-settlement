-- 請求書管理: invoices テーブル + Storage + RLS
-- 実行: Supabase Dashboard の SQL Editor または supabase db push

-- ============================================
-- 1. invoices テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name text NOT NULL DEFAULT '',
  vendor_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  target_month text NOT NULL DEFAULT '',
  file_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_checking', 'needs_fix', 'ai_ok', 'submitted', 'returned', 'approved'
  )),
  ai_result jsonb,
  human_checked jsonb,
  reviewer_comment text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_target_month ON public.invoices (target_month);

COMMENT ON TABLE public.invoices IS '請求書管理（アップロード〜承認・格納）';

-- ============================================
-- 2. RLS（Row Level Security）
-- ============================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ポリシーなし = anon/authenticated は全行アクセス不可。
-- すべてのアクセスは Next.js API Route 経由で getServerSupabase()（service_role）を使用する。

-- ============================================
-- 3. Storage バケット（invoices）
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- オブジェクトのアップロード・読み取りは API（service_role）経由のみ。RLS は storage のデフォルトのまま。
