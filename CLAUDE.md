# 勤怠管理アプリ — Claude Code 向け指示書

> このファイルはプロジェクトルートに `CLAUDE.md` として置いてください。
> Claude Code が自動で読み込み、コード生成時のルールとして参照します。

---

## プロジェクト概要

従業員がLINEから出退勤を打刻し、管理者がWebダッシュボードでリアルタイムに勤怠を把握できるシステム。

- 対象規模: チーム 5〜20名
- 従業員はLINEのみで操作完結（専用アプリ不要）
- 管理者はWebダッシュボード + LINEアラートで管理

---

## 技術スタック

| レイヤー             | 技術                                       |
| -------------------- | ------------------------------------------ |
| フレームワーク       | Nuxt3 + Vue3 (Composition API)             |
| スタイリング         | Tailwind CSS v4                            |
| UIコンポーネント     | Nuxt UI v4 (Nuxt 4 対応版)                 |
| データベース         | Firebase Firestore                         |
| 認証                 | Firebase Auth                              |
| バックグラウンド処理 | Firebase Cloud Functions + Cloud Scheduler |
| ホスティング         | Firebase Hosting または Cloud Run          |
| LINE連携             | LINE Messaging API                         |

---

## Nuxt3 コーディングルール

### 必須ルール（違反禁止）

- **`<script setup lang="ts">` のみ使用** — Options API（`export default defineComponent`）は使わない
- **データフェッチは `useFetch` または `useAsyncData` を使う** — 素の `fetch()` / `axios` をコンポーネント内で直接呼ぶことを禁止
- **リンクは `<NuxtLink>` を使う** — `<a href="">` は外部リンク以外禁止
- **サーバー処理は `server/api/` に配置** — クライアントコンポーネントにAPIキーや秘密情報を書かない
- **TypeScript 必須** — `.js` ファイルは作らない。すべて `.ts` / `.vue`

### コンポーネント設計

```vue
<!-- ✅ 正しい書き方 -->
<script setup lang="ts">
const { data: records, pending } = await useFetch("/api/attendance");
const isOpen = ref(false);
</script>

<template>
  <!-- 条件付き表示はLazyプレフィックスで遅延ロード -->
  <LazyClockEditModal v-if="isOpen" />

  <!-- ビューポートに入ったときだけハイドレーション -->
  <LazyAttendanceTable hydrate-on-visible />
</template>
```

### Composable 優先（プラグインに詰め込まない）

```
composables/
  useAttendance.ts   # Firestoreリアルタイムリスナー
  useAuth.ts         # Firebase Auth状態管理
  useLineNotify.ts   # LINE通知ロジック
```

- ロジックはすべて `composables/` に切り出す
- `plugins/` はサードパーティの初期化のみ（Firebase初期化など）
- 非同期プラグインは `parallel: true` を設定してハイドレーションをブロックしない

### ルーティング設定

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    "/": { prerender: true }, // トップページは静的生成
    "/dashboard": { ssr: true }, // ダッシュボードはSSR（リアルタイム）
    "/admin/**": { ssr: true }, // 管理画面はSSR
  },
});
```

### Server API の命名規則

```
server/api/
  webhook.post.ts        # POST /api/webhook
  attendance/
    index.get.ts         # GET /api/attendance
    [id].get.ts          # GET /api/attendance/:id
    [id].patch.ts        # PATCH /api/attendance/:id
  users/
    index.get.ts         # GET /api/users
    [id].get.ts          # GET /api/users/:id
```

---

## Vue3 / TypeScript ルール

- `ref()` / `computed()` / `watch()` は Composition API のものを使う
- `defineProps` / `defineEmits` は `<script setup>` 内で使う（importは不要）
- 型は `interface` で定義し `types/` ディレクトリに集約する
- `any` 型の使用禁止。不明な型は `unknown` を使い型ガードを書く

```ts
// types/attendance.ts
export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: Date;
  clockOut: Date | null;
  breaks: { start: Date; end: Date | null }[];
  totalWorkMinutes: number;
}

export interface User {
  uid: string;
  lineUserId: string;
  name: string;
  email: string;
  role: "admin" | "member";
}
```

---

## Tailwind CSS + Nuxt UI ルール

- スタイルはすべて Tailwind ユーティリティクラスで記述（カスタムCSS禁止）
- UIコンポーネントは Nuxt UI v3 (`UCard`, `UButton`, `UTable` など) を優先使用
- `<style>` ブロックは原則書かない。どうしても必要な場合のみ `<style scoped>`

```vue
<!-- ✅ Nuxt UI + Tailwind の組み合わせ -->
<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium">今日の勤怠状況</h2>
        <UBadge color="green" label="出勤中" />
      </div>
    </template>

    <div class="space-y-3">
      <div class="flex items-center gap-4 text-sm text-gray-500">
        <span>09:00 出勤</span>
      </div>
    </div>

    <template #footer>
      <UButton color="red" label="退勤打刻" block />
    </template>
  </UCard>
</template>
```

---

## Firebase ルール

### Firestore セキュリティルール の方針

- `users` コレクション: 本人のみ読み書き可。管理者は全員読み取り可
- `attendance_records`: 本人のみ書き込み可。管理者は全員読み取り・修正可
- `alert_logs`: 管理者のみ読み書き可

### リアルタイムリスナーの使い方

```ts
// composables/useAttendance.ts
import { collection, onSnapshot, query, where } from "firebase/firestore";

export const useAttendance = (date: string) => {
  const records = ref<AttendanceRecord[]>([]);

  const q = query(
    collection(db, "attendance_records"),
    where("date", "==", date),
  );

  // onSnapshotでリアルタイム更新
  const unsubscribe = onSnapshot(q, (snapshot) => {
    records.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AttendanceRecord[];
  });

  // コンポーネントのアンマウント時に解除
  onUnmounted(unsubscribe);

  return { records };
};
```

---

## LINE Webhook ルール

### 署名検証は必須

```ts
// server/api/webhook.post.ts
import crypto from "crypto";

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event);
  const signature = getHeader(event, "x-line-signature");
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;

  // 署名検証（これを省略しないこと）
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body!)
    .digest("base64");

  if (hash !== signature) {
    throw createError({ statusCode: 401, message: "Invalid signature" });
  }

  // 打刻処理...
});
```

### 打刻種別の判定

```ts
// ポストバックデータで打刻種別を識別
type ClockType = "clock_in" | "clock_out" | "break_start" | "break_end";

const getClockType = (postbackData: string): ClockType | null => {
  const map: Record<string, ClockType> = {
    "action=clock_in": "clock_in",
    "action=clock_out": "clock_out",
    "action=break_start": "break_start",
    "action=break_end": "break_end",
  };
  return map[postbackData] ?? null;
};
```

---

## ディレクトリ構成

Nuxt 4 の `srcDir: 'app'` 構成。pages/components/composables は `app/` 配下。

```
.
├── CLAUDE.md
├── nuxt.config.ts
├── firebase.json / firestore.rules / .firebaserc
├── types/                     # TypeScript型定義（rootDir）
│   ├── attendance.ts
│   └── user.ts
├── app/                       # Nuxt srcDir
│   ├── utils/
│   │   └── firebase.ts        # Firebase初期化（auto-import対象）
│   ├── pages/
│   │   ├── index.vue              # ダッシュボード（管理者）
│   │   ├── login.vue
│   │   ├── employees/
│   │   │   └── index.vue
│   │   └── reports/
│   │       └── [month].vue
│   ├── components/
│   │   ├── AttendanceTable.vue
│   │   ├── StatusBadge.vue
│   └── ClockEditModal.vue     # 打刻修正モーダル
├── composables/
│   ├── useAttendance.ts       # Firestoreリアルタイムリスナー
│   ├── useAuth.ts             # Firebase Auth
│   └── useLineNotify.ts       # LINE通知ロジック（Phase 5）
│   └── middleware/
│       └── auth.ts            # 認証ガード
├── server/
│   ├── api/
│   │   ├── webhook.post.ts    # LINE Webhook受信・署名検証
│   │   ├── attendance/
│   │   │   ├── index.get.ts
│   │   │   └── [id].patch.ts
│   │   └── users/
│   │       └── index.get.ts
│   └── utils/
│       └── line.ts            # LINE API ユーティリティ（サーバー専用）
└── functions/                 # Firebase Cloud Functions（Phase 5）
    ├── alerts/
    │   ├── checkNoClockIn.ts
    │   ├── checkForgotClockOut.ts
    │   └── checkLongWork.ts
    └── index.ts
```

---

## 機能要件サマリー

### LINE打刻フロー

`出勤` → `休憩開始` → `休憩終了` → `退勤`

| 機能     | 説明                                                            |
| -------- | --------------------------------------------------------------- |
| 出勤打刻 | リッチメニュータップ → Firestoreに時刻記録 → 確認メッセージ返信 |
| 退勤打刻 | 退勤記録 → 勤務時間を自動計算して返信                           |
| 休憩記録 | 休憩開始・終了を打刻。実働時間から自動除外                      |
| 打刻確認 | 「今日の状況は？」で当日サマリーを返信                          |

### 管理者アラート（Cloud Scheduler）

| アラート       | トリガー                               |
| -------------- | -------------------------------------- |
| 未出勤アラート | 勤務開始から30分経過しても出勤打刻なし |
| 長時間労働警告 | 実働時間が8時間超                      |
| 退勤忘れ通知   | 日付変更30分前に退勤未打刻             |
| 残業申告通知   | 所定時間超で退勤                       |

### 管理ダッシュボード

- リアルタイム勤怠一覧（onSnapshot）
- 月次集計レポート + CSVエクスポート
- 従業員管理（追加・削除・権限設定）
- 打刻修正（監査ログ付き）

---

## 参考ドキュメント（AI参照用）

- Nuxt3公式: https://nuxt.com/llms.txt
- Nuxt UI v3: https://ui.nuxt.com
- Firebase JS SDK: https://firebase.google.com/docs/reference/js
- LINE Messaging API: https://developers.line.biz/ja/docs/messaging-api/
