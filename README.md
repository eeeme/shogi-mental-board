# 将棋 脳内盤トレーニングアプリ

盤を見ずに座標・手順を扱う力（脳内盤）を鍛えるドリルアプリ。自分専用のトレーニングツールとして開発中。

## 特徴

- 音声で座標を読み上げ、スピード・出題範囲・マス数を自在に調整できるドリル
- 座標→位置 / 位置→座標 の双方向トレーニング
- 駒移動追跡・詰将棋（見ずに解く）
- 正答率・反応時間・連続日数を記録して上達を可視化
- バックエンド不要の PWA。端末内で完結

## 技術スタック

React + TypeScript + Vite / PWA / Tailwind CSS / Zustand / Web Speech API / IndexedDB

## セットアップ

```bash
npm install
npm run dev
```

- `npm run build` / `npm run preview` / `npm run test` / `npm run lint` / `npm run typecheck`

## ドキュメント

- `CLAUDE.md` — Claude Code 用のプロジェクト規約（座標系ルール・コーディング規約・運用）
- `docs/design.md` — 全体設計とフェーズ計画
- `docs/design-brief.md` — Claude Design 用のデザインブリーフ

## ロードマップ（概要）

自分専用MVP（機能 ①②③ ＋ 統計）→ 駒移動追跡・詰将棋 → Capacitor でネイティブ化して iOS/Android 展開。
