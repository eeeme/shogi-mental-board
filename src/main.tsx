import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { refreshEntitlement } from './lib/purchase'

// PWA: オフライン動作のための service worker 登録（自動更新）
registerSW({ immediate: true })

// 購入状況を Google Play に確かめる（アプリ版のみ）。
// 支払い待ちだった購入が完了していることもあるので、アプリに戻ってきたときにも確かめる。
void refreshEntitlement()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshEntitlement()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
