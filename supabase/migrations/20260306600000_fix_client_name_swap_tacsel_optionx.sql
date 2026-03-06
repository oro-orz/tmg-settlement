-- 請求先名の入れ替え修正（202603065 で逆に設定されていた場合の是正）
-- aa971581... → 株式会社TACSEL
UPDATE public.invoices
SET client_name = '株式会社TACSEL'
WHERE id = 'aa971581-e306-4271-b52a-e89527f51b10';

-- 1d6f07ed... → OPTION X株式会社
UPDATE public.invoices
SET client_name = 'OPTION X株式会社'
WHERE id = '1d6f07ed-6451-462e-9989-e99791164739';
