import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { BackBar } from './components/BackBar'
import { Home } from './pages/Home'
import { Stats } from './pages/Stats'
import { Settings } from './pages/Settings'
import { ListenScreen } from './features/listen/ListenScreen'
import { getFeature, type FeatureId } from './features/registry'

/** 開いている機能画面（ホームのカードから遷移）。 */
function FeatureScreen({ id, onBack }: { id: FeatureId; onBack: () => void }) {
  if (id === 'listen') return <ListenScreen onBack={onBack} />

  // 未接続の機能はプレースホルダ（後続フェーズで各画面を接続）。
  const meta = getFeature(id)
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <BackBar title={meta.title} onBack={onBack} />
      <div className="rounded-lg border border-line-soft bg-ink-900/60 p-6 text-center">
        <p className="text-sm text-sumi-300">準備中</p>
        <p className="mt-1 text-xs text-sumi-500">{meta.summary}</p>
      </div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [feature, setFeature] = useState<FeatureId | null>(null)

  const openFeature = (id: FeatureId) => {
    // 統計はボトムナビのタブに集約する。
    if (id === 'stats') {
      setFeature(null)
      setTab('stats')
      return
    }
    setFeature(id)
  }

  const changeTab = (t: Tab) => {
    setFeature(null)
    setTab(t)
  }

  const renderTab = () => {
    switch (tab) {
      case 'home':
        return <Home onOpen={openFeature} />
      case 'stats':
        return <Stats />
      case 'settings':
        return <Settings />
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 pb-20">
        {feature ? (
          <FeatureScreen id={feature} onBack={() => setFeature(null)} />
        ) : (
          renderTab()
        )}
      </main>
      {!feature && <BottomNav tab={tab} onChange={changeTab} />}
    </div>
  )
}

export default App
