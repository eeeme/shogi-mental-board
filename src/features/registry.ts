/**
 * ホームに並べるモードカードのメタ情報（00〜05）。
 * status='available' のモードだけが開ける。未実装は 'coming-soon'（disabled表示）。
 * MVP範囲は 00・01・02・03（＋統計タブ）。04・05 は後続フェーズ。
 * ※ 統計・支援は「モードカード」ではなくタブ（統計/問い合わせ）に集約する。
 */
export type FeatureId =
  | 'listen'
  | 'tapCell'
  | 'reverse'
  | 'sequence'
  | 'recall'
  | 'tsume'

export type FeatureStatus = 'available' | 'coming-soon'

export type FeatureMeta = {
  id: FeatureId
  /** モード番号（00〜05）。表示名にも使う。 */
  no: number
  title: string
  summary: string
  /** 説明モーダル用の少し詳しい説明（任意）。 */
  howto?: string
  /** レベル感/フェーズ表記（MVP / 後続）。資格名は使わない。 */
  scope: 'MVP' | '後続'
  status: FeatureStatus
}

export const FEATURES: FeatureMeta[] = [
  {
    id: 'listen',
    no: 0,
    title: 'ただ読み上げ',
    summary: '座標をひたすら音声で読み上げるだけ（受動・ながら聴き）',
    howto:
      '座標を停止するまで読み上げ続けます。タップも答え合わせもありません。通勤中などの「ながら聴き」に。発話間隔と範囲を設定できます。',
    scope: 'MVP',
    status: 'available',
  },
  {
    id: 'tapCell',
    no: 1,
    title: '読み上げ→マス押下',
    summary: '座標を1つ提示 → 該当マスを即タップ（逐次1問1答）',
    howto:
      '出された座標（符号 and/or 音声）のマスをその場でタップします。1問ずつ即採点。符号か音声の一方はオフにできます。',
    scope: 'MVP',
    status: 'available',
  },
  {
    id: 'reverse',
    no: 2,
    title: 'マスが光る→記号回答',
    summary: '光ったマスの座標を答える（逆変換）',
    howto:
      '盤の1マスが光ります。その座標を筋（1〜9）・段（一〜九）のピッカーで答えます。位置→符号の変換を鍛えます。',
    scope: 'MVP',
    status: 'available',
  },
  {
    id: 'sequence',
    no: 3,
    title: '系列記憶',
    summary: '座標をN個順に提示 → 記憶 → 示された順にタップして答え合わせ',
    howto:
      '座標をN個、順番に提示します。覚えたら、示された順にN個タップして答え合わせ。提示手段（盤面/符号/音声）は1つ以上オンにできます。',
    scope: 'MVP',
    status: 'available',
  },
  {
    id: 'recall',
    no: 4,
    title: 'ランダム配置記憶',
    summary: '交互に駒を打つ → 盤を隠して位置・向き・駒種を再現',
    scope: '後続',
    status: 'coming-soon',
  },
  {
    id: 'tsume',
    no: 5,
    title: '詰将棋',
    summary: '配置を音声で聞き、見ずに解く',
    scope: '後続',
    status: 'coming-soon',
  },
]

export function getFeature(id: FeatureId): FeatureMeta {
  const found = FEATURES.find((f) => f.id === id)
  if (!found) throw new Error(`unknown feature: ${id}`)
  return found
}
