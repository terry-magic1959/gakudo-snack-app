# 学童クラブ向け おやつ管理アプリ（雛形）

学童クラブで使うことを想定した、以下の機能を持つ管理アプリの土台です。

- おやつマスタ登録（在庫・最低在庫ライン・アレルゲンメモ）
- 配布記録（消費ログ）の登録
- 発注登録と発注一覧の集約表示
- 直近消費 + 最低在庫ラインからの発注候補提案
- 週別 / 月別レポート（配布数・平均・発注額など）
- 写真からのおやつ判別（現状はモック実装、将来AI連携に差し替え可能）

## 推奨構成（今回作成済み）

- フレームワーク: Next.js (App Router) + TypeScript
- DB: Prisma + SQLite（小規模運用に向く）
- 将来拡張:
  - PostgreSQL へ移行（施設数が増えたら）
  - 写真判別を Vision API に差し替え
  - 認証（先生ごとのログイン）

## セットアップ手順

```bash
cd "/Users/tanakateruyuki/Documents/New project/gakudo-snack-app"
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 写真判別をOpenAI連携にする方法（1の実装）

`.env` に以下を設定してください。

```env
SNACK_CLASSIFIER_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
# 任意（未指定時は gpt-4.1-mini）
OPENAI_VISION_MODEL="gpt-4.1-mini"
```

- キー未設定やAPIエラー時は、アプリが止まらないようにモック判別へ自動フォールバックします。
- 現在は `lib/classifier.ts` で OpenAI 呼び出しとモックを切り替えています。

## 画面でできること

1. おやつ登録
2. 配布記録の入力（配布数から在庫を自動減算）
3. 発注登録（`RECEIVED` を選ぶと在庫へ自動反映）
4. 週別 / 月別の集計確認
5. 週報CSV / 月報CSV の出力
6. 写真をアップロードして判別（モック / OpenAI切替）

## フォルダ構成

```text
gakudo-snack-app/
  app/
    api/
      analytics/
        csv/
      classify-snack/
      intakes/
      orders/
      snacks/
    globals.css
    layout.tsx
    page.tsx
  components/
    snack-dashboard.tsx
  lib/
    analytics.ts
    category.ts
    classifier.ts
    date.ts
    prisma.ts
    recommendation.ts
  prisma/
    schema.prisma
    seed.ts
```

## 写真判別の今後の実装方針（本番向け）

現状は `lib/classifier.ts` のモック判別です。次の順で拡張するのが現実的です。

1. 画像保存先を `S3` / `Cloud Storage` に変更（現在は `data URL` をDB保存）
2. Vision API で `商品名候補` を抽出
3. おやつマスタへ曖昧一致（完全一致 + 類似度）
4. 人手確認UI（候補を選択して確定）
5. 判別ログを学習データとして再利用

※ 今回の更新で `SNACK_CLASSIFIER_PROVIDER="openai"` による OpenAI API 連携を追加済みです（失敗時はフォールバック）。

## 発注フォーム（複数明細対応）

- 1回の発注で複数商品を登録できます。
- 画面の「明細を追加」で行を増やせます。
- `入荷済み（RECEIVED）` を選んで登録すると在庫に反映されます。

## CSV出力（週報 / 月報）

- ダッシュボード上部のレポート欄から `週報CSV` / `月報CSV` を出力できます。
- CSVには以下を含めています。
  - サマリー（配布数、平均、発注数・発注額）
  - 人気おやつランキング
  - 配布記録一覧
  - 発注一覧

## 週別・月別データの見方（運用）

- 週別: 毎週の消費傾向、次週の発注目安
- 月別: 予算管理、人気おやつランキング、発注コスト比較

## 次に入れると良い機能（優先度順）

1. アレルギー対応メニュー管理
2. クラス別/学年別の配布記録
3. ログイン権限（閲覧のみ / 編集可）
