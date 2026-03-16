# 業務ツール立替申請 - 統合システム

**請求書管理**・**AIツール申請（立替）**・**有給申請**の3機能をひとつの Next.js アプリで提供する業務ツールです。Firebase 認証・GAS 連携・Supabase・AI チェックを組み合わせて運用します。

---

## システム構成

| 機能 | 説明 | 主な画面・データ |
|------|------|------------------|
| **請求書管理** | 請求書・領収書のアップロード〜経理承認まで | アップロード（認証不要）、経理管理、アーカイブ／Supabase + Storage、Gemini |
| **ツール申請（立替）** | 業務ツール利用の立替申請と経理・役員承認 | 申請一覧、AIチェック進捗／GAS + スプシ、OpenAI・Gemini |
| **有給申請** | 休暇申請の承認と有給残日数の確認 | 休暇申請承認、有給残日数／GAS（休暇用） |

---

## 1. 請求書管理

請求書・領収書を PDF で登録し、AI チェックと社内確認を経て経理が承認または差し戻しするフローです。

### 主な画面

- **`/upload`** … アップロード（認証不要）  
  個別 or 一括で PDF を登録。種別（売上／支払い／領収書）・担当者・対象月を入力。担当者は登録済みリストから選択。
- **`/dashboard`** … 経理管理（ログイン必須）  
  一覧で請求書を選択し、PDF 確認・AI 結果確認・留意項目チェックのうえ「経理へ提出」。経理提出後は承認 or 差し戻し（理由入力）。請求元・担当者名は右パネルで手動修正可能。
- **`/archive`** … 承認済みの請求書一覧（月別）。
- **`/status/[id]`** … 進捗確認（認証不要）  
  提出時に案内する URL で、取引先がステータス・差し戻し理由を確認。

### 流れ

1. アップロード（担当者 or 取引先） → PDF 登録
2. AI チェック（抽出・必須項目チェック）※一括はダッシュボードから実行可
3. 社内担当者が留意5項目を確認 → 経理へ提出
4. 経理が承認 or 差し戻し（差し戻し時は Chatwork で担当者に通知）
5. 承認分は正式格納。差し戻し分は理由を確認のうえ再提出

### 技術・データ

- **データ**: Supabase（`invoices` テーブル + Storage）
- **AI**: Google Gemini（請求書 PDF の読み取り・チェック）
- **通知**: Chatwork（経理提出時・差し戻し時）
- **認証**: アップロード・進捗確認は認証不要。一覧・承認はログイン必須。アップロードは同一 IP で 5 分あたり 3 件までレート制限。

---

## 2. AIツール申請（立替申請）

業務ツール利用に伴う立替申請の一覧表示と、経理・役員の二段階承認を行います。申請データは GAS + スプレッドシートで管理します。

### 主な画面

- **`/applications`** … 申請一覧（対象月）  
  左に一覧、右に詳細・領収書表示。AI 自動チェック結果を表示し、経理承認・差し戻し・役員へ回すを実行。
- **`/ai-check-jobs`** … AI チェックの一括実行・進捗確認

### 流れ

1. 申請は GAS／スプシ側で登録（本アプリは承認・AI チェック用）
2. 経理が一覧から選択し、領収書と AI 判定を確認
3. 経理承認 or 差し戻し or 役員へ回す
4. 役員確認待ちの申請は役員が最終承認 or 差し戻し
- **`/archive`**（立替用） … 過去月の申請アーカイブ表示

### 技術・データ

- **データ**: Google Apps Script（GAS）+ スプレッドシート + Google Drive（領収書画像）
- **AI**: OpenAI / Gemini（領収書の読み取り・整合性チェック）
- **承認履歴・コメント**: Supabase（`approval_history`）。スプシには書き戻しません。

---

## 3. 有給申請

休暇申請の承認と有給残日数の確認を行います。申請データは休暇用 GAS で管理します。

### 主な画面

- **`/leave-approval`** … 休暇申請の承認  
  対象月の申請一覧を表示し、承認・差し戻しなどの操作を実行。
- **`/paid-leave`** … 有給残日数一覧  
  GAS から取得した有給残日数データを表示。
- **`/leave`** … 休暇申請（申請フォーム未実装・プレースホルダーのみ）

### 技術・データ

- **データ**: 休暇申請用 GAS（`NEXT_PUBLIC_LEAVE_GAS_API_URL`）

---

## セットアップ

### 1. 環境変数

```bash
cp .env.local.example .env.local
```

`.env.local` で以下を設定します。

| 用途 | 変数例 |
|------|--------|
| 立替申請一覧（GAS） | `NEXT_PUBLIC_GAS_API_URL` |
| 休暇申請（GAS） | `NEXT_PUBLIC_LEAVE_GAS_API_URL` |
| AI（領収書OCR・画像） | `OPENAI_API_KEY` |
| AI（請求書PDF・領収書） | `GOOGLE_GEMINI_API_KEY` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Firebase 認証 | `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` または `FIREBASE_SERVICE_ACCOUNT_KEY`、`AUTH_SECRET` |
| ログイン許可 | `ALLOWED_LOGIN_EMAILS` / `ALLOWED_DEPARTMENTS` / `ALLOWED_ROLE` のいずれか |
| 請求書通知 | `CHATWORK_API_TOKEN`, `CHATWORK_ROOM_ID`（任意）、`NEXT_PUBLIC_APP_URL`（任意） |

詳細は `.env.local.example` を参照してください。

### 2. Supabase

- プロジェクト作成後、**SQL Editor** で `supabase/migrations/` 内のマイグレーションを順に実行（請求書用 `invoices`・Storage、立替用 `approval_history`、その他）。
- **Settings → API** で Project URL と `service_role` キーを取得し、上記の環境変数に設定。

### 3. Firebase 認証

- Firebase Console でプロジェクト・認証（Google）を設定。
- クライアント用: `NEXT_PUBLIC_FIREBASE_*` を設定。
- サーバー用: Service Account の JSON を `firebase-service-account.json` に保存するか、`FIREBASE_SERVICE_ACCOUNT_KEY` に 1 行で設定。
- セッション署名用に `AUTH_SECRET`（32 文字以上）を設定。

### 4. GAS（立替申請）

- 申請管理用スプレッドシートに、AI チェック結果・経理チェック・役員承認用の列を追加。
- `docs/ファイル群2.md` 等を参照し、GAS を Web アプリとしてデプロイ。**JSON を返す API** 用の URL を `NEXT_PUBLIC_GAS_API_URL` に設定。

### 5. 起動

```bash
npm install
npm run dev
```

http://localhost:3000 にアクセス（未ログイン時は `/login` にリダイレクト。`/upload` は認証不要）。

---

## 技術スタック

- **フロント**: Next.js 15 (App Router)、Tailwind CSS、shadcn/ui
- **認証**: Firebase Auth（Google）
- **請求書**: Supabase（DB + Storage）、Google Gemini
- **立替申請**: GAS、スプレッドシート、Drive／OpenAI・Gemini
- **有給**: GAS（休暇用）
- **共通**: Supabase（承認履歴等）、Chatwork（請求書の通知）

---

## ディレクトリ構造（抜粋）

```
app/
├── page.tsx                 # ルート → /dashboard へリダイレクト
├── login/
├── upload/                  # 請求書アップロード（認証不要）
├── dashboard/                # 請求書 経理管理
├── archive/                  # 請求書 承認済みアーカイブ
├── invoices/[id]/            # 請求書 詳細・経理レビュー
├── status/[id]/              # 請求書 進捗確認（認証不要）
├── applications/             # 立替申請 一覧・承認
├── ai-check-jobs/            # 立替 AIチェック進捗
├── leave/                    # 休暇申請（申請フォーム未実装・プレースホルダーのみ）
├── leave-approval/           # 休暇申請 承認
├── paid-leave/               # 有給残日数
└── api/
    ├── invoices/             # 請求書 CRUD・AI・承認・status
    ├── assignees/            # 担当者一覧（請求書用）
    ├── applications/        # 立替申請（GAS ラップ）
    ├── ai-check/             # 立替 領収書 AI チェック
    ├── approval-history/     # 立替 承認履歴（Supabase）
    ├── leave-applications/   # 休暇申請一覧
    ├── leave-approval/       # 休暇承認
    └── paid-leave-list/     # 有給残日数
components/
├── invoice/                 # 請求書用（一覧・承認・担当者選択など）
├── approval/                # 立替・休暇 承認用
└── layout/                  # AppShell, Header, Sidebar
lib/
├── invoiceAiChecker.ts      # 請求書 PDF AI
├── aiChecker.ts             # 領収書 AI
├── supabase.ts
├── gasApi.ts
└── chatwork.ts              # 請求書 Chatwork 通知
supabase/migrations/         # 請求書・担当者・承認履歴等
```

---

## ライセンス

MIT
