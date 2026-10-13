# Android リリース手順書（Capacitor + Google Play）

**この手順の多くは、あなたのPC・実機・各アカウントが必要**です（サンドボックス/CIでは実行不可）。
リポジトリ側の準備（Capacitor 化・課金の抽象化・プライバシーポリシー・文面）は済んでいます。

- iOS は今回見送り（Android の反応を見てから）。
- 有料アンロック（300円・買い切り）で解除されるのは **有料モード ＋ 00 のバックグラウンド読み上げ**。

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
- バージョンは CI が自動で付ける（5章）。手元ビルドの既定は versionCode 1 / versionName 1.0.0。

> **重要**: ネイティブ配信用ビルドは **base を `/`** にする（`BASE_PATH` を未指定 = 既定 `/`）。
> GitHub Pages 用の `BASE_PATH=/shogi-mental-board/` はネイティブでは使わない。

## 2. バックグラウンド読み上げ（00モード・実装済み）

Web の `speechSynthesis` は画面ロックで止まり、Android の WebView では使えない端末もあるため、
**読み上げはすべて Android 標準の TextToSpeech（ネイティブ）で行う**。

- `android/.../speech/SpeechEngine.java`: TextToSpeech をアプリ全体で1つだけ持つ。
- `android/.../speech/ListenService.java`: フォアグラウンドサービス（種類 `mediaPlayback`）。
  通知を出している間、画面オフ・他アプリ使用中でも読み上げを続ける。通知の「停止」で止まる。
  次に読むマスはサービス側で選ぶ（画面オフ中は JavaScript が止まるため）。
- `android/.../speech/NativeSpeechPlugin.java`: 画面（`src/lib/nativeSpeech.ts`）から呼ぶ窓口。
- バックグラウンド継続は**購入者のみ**（`ListenScreen` で `isNative && isPro` のとき使う）。無料の場合は画面表示中だけ読み上げる。
- Android 13 以降は通知の許可を求める。許可しなくても読み上げは続く（通知が出ないだけ）。

## 3. 課金（買い切り・実装済み）

詳細は `docs/monetization.md`。Play Console 側で次を行う。

1. **収益化 → 商品 → アプリ内アイテム** で商品を作成。
   - 商品ID: **`unlock_all`**（コードと一致させる。後から変更不可）
   - 価格: **300円**
   - 状態を **有効** にする
2. **アプリのコンテンツ → フォアグラウンド サービス** の申告で「メディアの再生」を選び、
   用途（画面オフでもマス目の読み上げを続ける）と、動作がわかる動画のリンクを登録する。
3. 購入テストは **ライセンス テスター** に自分の Google アカウントを登録して行う（実際には課金されない）。

## 4. ストア素材・プライバシー

- 掲載文・購入文面: `docs/store-listing.md`。
- **プライバシーポリシー（必須・公開URL）**: `https://eeeme.github.io/shogi-mental-board/privacy.html`（公開済み）。
- **スクリーンショット/アイコン/フィーチャーグラフィック**は実機/エミュレータで用意（`docs/store-listing.md` 参照）。

## 5. ビルドとリリース（GitHub Actions）

- `.github/workflows/android.yml` が AAB を作る。
  - main への push / 手動実行: 署名付き AAB を作り、成果物 `shogi-mental-board-<番号>` に置く。
  - プルリクエスト: ビルドが通るかだけ確認（署名なし）。
- versionCode は実行番号（`run_number`）、versionName は `package.json` の `version`。
- 署名には GitHub の Secrets が必要: `ANDROID_KEYSTORE_BASE64`（アップロード鍵の base64）、`ANDROID_KEYSTORE_PASSWORD`。鍵の別名は `upload`。
- 組織アカウントのため、個人アカウントにある「12人・14日のクローズドテスト」の要件はない。
  内部テストで確認してから製品版に出す。

## 6. 費用まとめ

- Google Play Console: 登録料（支払い済み）。
- Google Play の手数料（売上の15%）。ほかの外部サービス費用はなし。

---

## リポジトリ側で済んでいること（チェック）

- [x] Capacitor 導入・アプリID/名称設定
- [x] ネイティブ読み上げ・バックグラウンド継続（フォアグラウンドサービス）
- [x] 買い切り課金（`unlock_all` / 300円）・購入を復元・状態の再確認
- [x] GitHub Actions での AAB ビルド
- [x] プライバシーポリシー公開・ストア文面（`docs/store-listing.md`）

## あなた（リリース担当）がやること

- [ ] GitHub Secrets（`ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD`）の登録
- [ ] Play Console: アプリ内アイテム `unlock_all`（300円・有効）作成、フォアグラウンド サービスの申告
- [ ] 実機確認: 画面オフでの読み上げ継続、通知の「停止」、購入、購入を復元
- [ ] スクショ等ストア素材の作成
- [ ] 内部テスト → 製品版公開
