-- 担当者リスト（Chatwork メンション用）。API の service_role のみ参照。
CREATE TABLE IF NOT EXISTS public.chatwork_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL UNIQUE,
  account_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatwork_assignees_account_name ON public.chatwork_assignees (account_name);

ALTER TABLE public.chatwork_assignees ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.chatwork_assignees IS '請求書提出の主な担当者（Chatwork account_id と表示名）。差し戻し通知のメンションに使用。';

-- 初期データ: docs/ChatWorkList.md の 3 行目以降（空行除く）
INSERT INTO public.chatwork_assignees (account_id, account_name) VALUES
  ('9991262', '西野 沙紀'),
  ('9147923', '村上 未羽'),
  ('9082049', '小野 良太'),
  ('9040420', '松本 和花'),
  ('9040415', '土居 綾音'),
  ('8960597', '神西 瑛尚'),
  ('8330335', '中村 駿太'),
  ('8230074', '赤峰 雄太'),
  ('7791067', '弓場 千富美'),
  ('7487932', '仙波 未来'),
  ('7487913', '佐藤 舞'),
  ('6777585', '銅木 晴花'),
  ('6685054', '宮崎 秀汰朗'),
  ('4756504', '廣瀬 崚ニ'),
  ('4007028', '坂本 匠'),
  ('3361112', '田中 未来'),
  ('2972473', '藤原 瑞基'),
  ('2770625', '甲斐 忍'),
  ('2077588', '星野 哲朗'),
  ('1850775', '上島 悠紀'),
  ('1477757', '丸田 淳貴'),
  ('1124383', '小山 亮'),
  ('910295', '潮崎 由愛'),
  ('629840', '國場 義功'),
  ('7558325', 'Timingood システム課')
ON CONFLICT (account_id) DO NOTHING;
