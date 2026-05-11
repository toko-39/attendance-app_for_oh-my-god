# チケット一覧

## #1 Phase 1: Firebase環境構築・Nuxt3プロジェクト初期セットアップ

**ステータス**: pending

### 概要
プロジェクトの土台を構築する。

### 作業内容
- Nuxt3プロジェクト作成（Tailwind CSS v4 + Nuxt UI v3）
- Firebase プロジェクト作成・初期化（Firestore, Auth, Cloud Functions, Hosting）
- `lib/firebase.ts` でFirebase初期化
- Firestoreコレクション設計・セキュリティルール設定
  - `users` / `attendance_records` / `alert_logs`
- Firebase Auth（管理者ログイン）の基本実装
- `composables/useAuth.ts` 実装
- LINEチャンネル作成（Messaging API）・チャンネルアクセストークン取得
- `lib/line.ts` でLINE SDK設定
- 環境変数（`.env`）の設計（Firebase config, LINE Channel Secret/Token）
- CLAUDE.md更新

### 必要な情報（実装時にユーザーに確認）
- Firebase プロジェクトID・設定値
- LINE Channel Secret / Channel Access Token

---

## #2 Phase 2: LINE Webhook受信・基本打刻機能（出勤・退勤）

**ステータス**: pending

### 概要
LINEからの出勤・退勤打刻の基本フローを実装する。

### 作業内容
- `server/api/webhook.post.ts` 実装
  - `X-Line-Signature` ヘッダーの署名検証
  - メッセージイベント・ポストバックイベントの受信・判定
- 打刻種別の識別ロジック（出勤 / 退勤）
- Firestoreへの打刻時刻記録（`attendance_records`）
- 打刻後の確認メッセージ返信（LINE Reply Message API）
- LINE userId と Firebase UID の紐付けフロー（初回登録）
  - 招待リンク or QRコードによる登録フロー設計・実装
- `composables/useAttendance.ts` の基本実装

### 必要な情報（実装時にユーザーに確認）
- LINE Webhook URL の設定確認（Firebase Hosting or Cloud Run のドメイン）

### 前提
- #1 完了後に着手

---

## #3 Phase 3: リッチメニュー・休憩記録・打刻確認返信

**ステータス**: pending

### 概要
打刻フローを完成させ、LINEの操作性を向上させる。

### 作業内容
- LINEリッチメニュー設定（LINE Official Account Managerで設定）
  - ポストバックアクションで打刻種別を識別（出勤 / 休憩開始 / 休憩終了 / 退勤）
- 休憩開始・休憩終了の打刻記録
  - `attendance_records.breaks` への記録
  - 実働時間から休憩時間を自動除外する計算ロジック
- 打刻確認機能（「今日の状況は？」メッセージへの返信）
  - 当日の打刻サマリーを返信
- 退勤時の勤務時間自動計算・返信
- Webhook処理の完全なステートマシン実装（出勤→休憩開始→休憩終了→退勤）

### 前提
- #2 完了後に着手

---

## #4 Phase 4: 管理者Webダッシュボード（Nuxt3 + Nuxt UI）

**ステータス**: pending

### 概要
管理者向けWebダッシュボードをNuxt3 + Nuxt UIで実装する。

### 作業内容
- Firebase Auth による管理者ログイン画面
- `pages/index.vue`: リアルタイム勤怠一覧ダッシュボード
  - `onSnapshot` を使ったFirestoreリアルタイムリスナー
  - 在席中 / 休憩中 / 退勤済 / 未出勤 のステータス表示
  - `components/AttendanceTable.vue` / `components/StatusBadge.vue`
- `pages/employees/index.vue`: 従業員一覧・管理
  - メンバー追加・削除・役割設定
  - LINE userId とのマッピング管理
- 打刻修正機能
  - `components/ClockEditModal.vue`
  - 修正履歴を監査ログとして保持
- `pages/reports/[month].vue`: 月次集計レポート
  - 従業員ごとの実働時間・残業時間・出欠のカレンダー＆テーブル表示
  - CSVエクスポート機能

### 前提
- #1（Firebase Auth）完了後に着手可能

---

## #5 Phase 5: Cloud Schedulerアラート・月次集計・デプロイ

**ステータス**: pending

### 概要
Firebase Cloud Functions + Cloud Schedulerによる自動アラートと本番デプロイを行う。

### 作業内容
- Firebase Cloud Functions 実装
  - `functions/alerts/checkNoClockIn.ts`: 勤務開始30分経過・未出勤アラート
  - `functions/alerts/checkForgotClockOut.ts`: 日付変更30分前・退勤未打刻通知
  - `functions/alerts/checkLongWork.ts`: 実働8時間超の長時間労働警告
  - 退勤時の残業申告通知
- Cloud Scheduler でのトリガー設定
- LINE Push Message API での管理者・対象従業員へのアラート送信
- `composables/useLineNotify.ts` 実装
- 月次集計バッチ処理（`attendance_records` の集計）
- Firebase Hosting または Cloud Run へのデプロイ設定
- 本番環境の環境変数設定・セキュリティルール最終確認

### 必要な情報（実装時にユーザーに確認）
- デプロイ先（Firebase Hosting or Cloud Run）の最終決定
- 管理者のLINEアカウントID（Push通知の送信先）
- 勤務開始時刻の設定（未出勤アラートのトリガー時刻）

### 前提
- #1〜#4 完了後に着手
