-- 種別に領収書（receipt）を追加
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_type_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_type_check
  CHECK (type IN ('received', 'payment', 'receipt'));

COMMENT ON COLUMN public.invoices.type IS 'received: 売掛, payment: 買掛, receipt: 領収書';
