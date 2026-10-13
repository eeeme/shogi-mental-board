import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor 設定（Android 先行）。
 * webDir は Vite の本番ビルド出力（dist）。ビルド手順は docs/release-android.md。
 * ※ ネイティブ配信時は base を '/' にしてビルドすること（GitHub Pages 用の
 *    サブパス base はネイティブでは不要）。BASE_PATH を未指定にすれば '/' になる。
 */
const config: CapacitorConfig = {
  appId: 'com.eeeme.shogimentalboard',
  appName: '将棋 脳内盤トレーニング',
  webDir: 'dist',
  backgroundColor: '#14110f',
  android: {
    backgroundColor: '#14110f',
  },
  plugins: {
    // 画面上端のステータスバー（時計・電池）と下端のナビゲーションバーに中身が重ならないよう、
    // 余白は CSS の env(safe-area-inset-*) で取る（定跡帳と同じ設定）。
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
}

export default config
