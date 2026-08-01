# Android リリース手順書（Capacitor + Google Play + RevenueCat）

**この手順の多くは、あなたのPC・実機・各アカウントが必要**です（サンドボックス/CIでは実行不可）。
リポジトリ側の準備（Capacitor 化・課金の抽象化・プライバシーポリシー・文面）は済んでいます。

- iOS は今回見送り（Android の反応を見てから）。
- 有料アンロックで解除されるのは **03 系列記憶 ＋ バックグラウンド再生**。04/05 は未実装で購入者に今後追加（追加課金なし）。

---

## 0. 事前準備（あなたのPC）

- **JDK 17**、**Android Studio**（Android SDK / Platform-Tools）をインストール。
- リポジトリを clone し `npm install`。

## 1. 実機ビルド（まず動かす）

```bash
npm run cap:sync     # npm run build（base='/'）→ npx cap sync android
npm run cap:open     # Android Studio で android/ を開く
```

- Android Studio で実機/エミュレータに Run。白画面なら `npm run build` の再実行と `npx cap sync android` を確認。
- アプリID: `com.eeeme.shogimentalboard`（`capacitor.config.ts` / `android/app/build.gradle`）。
- バージョンは `android/app/build.gradle` の `versionCode` / `versionName`。更新ごとに `versionCode` を+1。

> **重要**: ネイティブ配信用ビルドは **base を `/`** にする（`BASE_PATH` を未指定 = 既定 `/`）。
> GitHub Pages 用の `BASE_PATH=/shogi-mental-board/` はネイティブでは使わない。

## 2. バックグラウンド再生（00モード）

Web の `speechSynthesis` は画面ロックで停止する（`docs/spike-background-audio.md`）。
ネイティブでは以下で実装する（**実機での実装・確認が必要**）:

1. **音声素材**: `coords` のカタカナ読みで **81マス分の音声ファイル**を生成し `public/audio/` に置く
   （まず81個で自然さ確認 → 重ければ「筋9＋段9＝18クリップ連結」に最適化）。
   - 生成例(macOS): `say -v Kyoko -o out.aiff "ナナロク"` → `ffmpeg` で mp3/opus 化。クラウドTTSでも可。
2. **再生**: 単一の `<audio>` を使い回し、`ended` で次マスへ差し替え。`lib/mediaSession.ts` で
   ロック画面コントロールを出す（メタデータ＋play/pause/stop）。
3. **継続**: Android は **Foreground Service**（通知常駐）で画面オフでも継続。
   - 既存のコミュニティ製プラグイン（例: foreground-service 系）を使うか、簡単な Capacitor プラグインを自作。
   - iOS 対応時は `UIBackgroundModes: audio` ＋ `AVAudioSession`。
4. バックグラウンド再生は**有料アンロック対象**（`useBackgroundUnlocked()` が true のときのみ提供）。

## 3. 課金（RevenueCat・買い切り）

現状は `src/lib/entitlement.ts` の `useEntitlement()` がダミー（`isPro:false`）、
購入/復元は `src/lib/purchase.ts` がダミー。ここを RevenueCat に差し替える。

1. **Google Play Console**（$25・初回のみ）でアプリ登録 →
   **アプリ内商品（管理対象＝非消費型 / Non-Consumable）** を1つ作成（例: `unlock_all`）。
2. **RevenueCat** アカウント作成 → プロジェクトに Google Play を接続 →
   Entitlement（例 `pro`）を作り、上記商品を紐付け。**公開APIキー**を取得。
3. 依存追加: `npm i @revenuecat/purchases-capacitor` → `npx cap sync android`。
4. 差し替え:
   - アプリ起動時に `Purchases.configure({ apiKey })`。
   - `useEntitlement()`: `Purchases.getCustomerInfo()` の `entitlements.active['pro']` の有無で `isPro` を返す
     （更新は listener で state に反映）。
   - `purchase.ts` の `purchaseUnlock()` = `Purchases.purchaseStoreProduct(...)`、
     `restorePurchases()` = `Purchases.restorePurchases()`。成功時に entitlement を再取得。
5. これで **03・バックグラウンド再生がロック → 購入/復元で解除**。00/01/02 は無制限のまま。
6. **「購入を復元」は設定画面に実装済み**（ダミー→RevenueCatに接続するだけ）。

> レシート検証は RevenueCat がサーバーレスで担うため「バックエンドなし」を維持できる。

## 4. ストア素材・プライバシー

- 掲載文・購入文面: `docs/store-listing.md`。
- **プライバシーポリシー（必須・公開URL）**: `https://eeeme.github.io/shogi-mental-board/privacy.html`（公開済み）。
- **スクリーンショット/アイコン/フィーチャーグラフィック**は実機/エミュレータで用意（`docs/store-listing.md` 参照）。

## 5. リリース工程（Google Play）— 最短でも14日

個人アカウント（2023-11-13以降作成）は製品版公開前に
**「12人以上のテスターが14日連続でオプトインしたクローズドテスト」が必須**（実インストール実績が要る）。

1. **署名鍵**を作成（Play アプリ署名 / アップロード鍵）。`android/app/build.gradle` に署名設定 →
   リリースビルド **AAB**（`.aab`）を生成（Android Studio の Generate Signed Bundle）。
2. Play Console で **クローズドテストのトラック**を作り AAB をアップロード。
3. **テスターを 12人以上**（離脱に備え 15〜20人のバッファ）集め、**オプトインリンク**から
   インストール・起動してもらう。**14日連続**カウント。
4. **テスト期間中に 2〜3回アップデート**を配信（軽微修正で可＝発音微調整・04モード実装など）。
   → 製品版アクセス申請の通過率が上がる。
5. 14日達成後、**製品版アクセスを申請 → 審査 → 公開**。

## 6. 費用まとめ

- Google Play Console: **初回 $25**。
- （将来 iOS: Apple Developer Program 年 $99。今回は不要）
- RevenueCat: 個人規模なら**無料枠**で足りる。

---

## リポジトリ側で済んでいること（チェック）

- [x] Capacitor 導入・`android/` 生成・アプリID/名称設定（`npm run cap:sync` で同期）
- [x] 課金モデル刷新（回数制限廃止 → 買い切りアンロック）と抽象化（`entitlement.ts` / `purchase.ts`）
- [x] ロックUI（ホームのロック表示・ポップアップの購入導線・正直な文面）
- [x] 「購入を復元」ボタン（設定）※中身は RevenueCat 接続待ち
- [x] プライバシーポリシー公開（GitHub Pages）
- [x] ストア文面（`docs/store-listing.md`）

## あなた（リリース担当）がやること

- [ ] Android Studio で実機ビルド確認
- [ ] バックグラウンド再生のネイティブ実装＋実機確認（音声素材生成含む）
- [ ] RevenueCat 接続（`useEntitlement`/`purchase` の差し替え）＋購入・復元の実機確認
- [ ] スクショ等ストア素材の作成
- [ ] Play Console 登録 → クローズドテスト14日 → 製品版公開
