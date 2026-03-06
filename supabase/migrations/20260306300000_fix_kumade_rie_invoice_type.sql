-- 熊手りえの請求書を売掛(received)から買掛(payment)に修正
UPDATE public.invoices
SET type = 'payment'
WHERE submitter_name = '熊手りえ'
   OR vendor_name LIKE '%熊手%';
