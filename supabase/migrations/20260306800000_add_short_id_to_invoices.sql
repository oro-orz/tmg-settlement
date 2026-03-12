-- 請求書の短い表示用ID（YYYYMM-001 形式）。Chatwork通知・ダッシュボードリンク用。
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS short_id text;

-- 既存データ: 作成日の月ごとに連番を付与（created_at 昇順）
UPDATE public.invoices i
SET short_id = sub.yyyymm || '-' || lpad(sub.rn::text, 3, '0')
FROM (
  SELECT
    id,
    to_char(COALESCE(created_at, now()), 'YYYYMM') AS yyyymm,
    row_number() OVER (PARTITION BY to_char(COALESCE(created_at, now()), 'YYYYMM') ORDER BY created_at NULLS LAST) AS rn
  FROM public.invoices
  WHERE short_id IS NULL
) sub
WHERE sub.id = i.id;

ALTER TABLE public.invoices
  ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_short_id ON public.invoices (short_id);

COMMENT ON COLUMN public.invoices.short_id IS '表示用短ID（YYYYMM-連番）。月ごとに1から採番。';
