-- 請求先名の修正: 請求元が弊社(Timingood)になっている売掛の請求先を正しい取引先名に更新
-- OPTION X株式会社
UPDATE public.invoices
SET client_name = 'OPTION X株式会社'
WHERE id = 'aa971581-e306-4271-b52a-e89527f51b10';

-- 株式会社TACSEL
UPDATE public.invoices
SET client_name = '株式会社TACSEL'
WHERE id = '1d6f07ed-6451-462e-9989-e99791164739';
