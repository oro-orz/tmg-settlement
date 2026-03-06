-- 承認時のファイルリネーム用: type（受取/支払い）と file_name（承認後の正式ファイル名）
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'received'
    CHECK (type IN ('received', 'payment')),
  ADD COLUMN IF NOT EXISTS file_name text;

COMMENT ON COLUMN public.invoices.type IS 'received: 取引先からの受取請求書, payment: 社内作成の支払い請求書';
COMMENT ON COLUMN public.invoices.file_name IS '承認後の正式ファイル名（アーカイブ表示用）';
