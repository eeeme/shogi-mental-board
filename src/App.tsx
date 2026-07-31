import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { BackBar } from './components/BackBar'
import { ModeIntroModal } from './components/ModeIntroModal'
import { Home } from './pages/Home'
import { Stats } from './pages/Stats'
import { Settings } from './pages/Settings'
import { SequenceScreen } from './features/sequence/SequenceScreen'
import { TapCellScreen } from './features/tapCell/TapCellScreen'
import { ReverseScreen } from './features/reverse/ReverseScreen'
import { ListenScreen } from './features/listen/ListenScreen'
import { getFeature, type FeatureId } from './features/registry'
import { useModeIntro } from './store/useModeIntro'

/** 開いている機能画面（ホームのカードから遷移）。 */
function FeatureScreen({
  id,
  onBack,
  onInfo,
}: {
  id: FeatureId
  onBack: () => void
  onInfo: () => void
}) {
  if (id === 'tapCell') return <TapCellScreen onBack={onBack} onInfo={onInfo} />
  if (id === 'reverse') return <ReverseScreen onBack={onBack} onInfo={onInfo} />
  if (id === 'sequence')
    return <SequenceScreen onBack={onBack} onInfo={onInfo} />
  if (id === 'listen') return <ListenScreen onBack={onBack} onInfo={onInfo} />

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
  const [introFor, setIntroFor] = useState<FeatureId | null>(null)
  const isDismissed = useModeIntro((s) => s.isDismissed)

  const openFeature = (id: FeatureId) => {
    // 統計はボトムナビのタブに集約する。
    if (id === 'stats') {
      setFeature(null)
      setTab('stats')
      return
    }
    setFeature(id)
    // モード選択時、未読なら説明モーダルを表示してから開始する。
    if (!isDismissed(id)) setIntroFor(id)
  }

  const changeTab = (t: Tab) => {
    setFeature(null)
    setIntroFor(null)
    setTab(t)
  }

  const closeFeature = () => {
    setFeature(null)
    setIntroFor(null)
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
          <FeatureScreen
            id={feature}
            onBack={closeFeature}
            onInfo={() => setIntroFor(feature)}
          />
        ) : (
          renderTab()
        )}
      </main>
      {!feature && <BottomNav tab={tab} onChange={changeTab} />}
      {introFor && (
        <ModeIntroModal id={introFor} onClose={() => setIntroFor(null)} />
      )}
    </div>
  )
}

export default App
