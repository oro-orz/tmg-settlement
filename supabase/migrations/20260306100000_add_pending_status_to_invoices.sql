-- 一括アップロード用: status に 'pending'（AIチェック待ち）を追加
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'pending',
    'draft',
    'ai_checking',
    'needs_fix',
    'ai_ok',
    'submitted',
    'returned',
    'approved'
  ));
