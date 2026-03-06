-- 請求先名を保存するカラム追加（売掛の一覧で「請求先」表示用）
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.invoices.client_name IS '請求先名（売掛のときの宛先・お客様名）。買掛・領収書では未使用。';
