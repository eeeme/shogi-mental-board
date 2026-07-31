/**
 * セッション記録の永続化（IndexedDB）。
 * 統計（機能⑥）はここに溜めた Session を集計して表示する。
 * 設定は localStorage（useSettings）側。ここは試行ログ専用。
 */

/** 各機能のモード（docs/design.md 6章）。 */
export type Mode = 'tap' | 'reverse' | 'sequence' | 'recall' | 'tsume'

/** 1 試行の記録。 */
export type Trial = {
  /** 出題（符号や手順）。 */
  prompt: string
  /** ユーザー回答。 */
  answer: string
  correct: boolean
  /** 反応時間(ms)。 */
  ms: number
}

/** 1 セッション（開始〜終了までの試行列）。 */
export type Session = {
  id: string
  mode: Mode
  startedAt: number
  finishedAt: number
  trials: Trial[]
}

const DB_NAME = 'shogi-mental-board'
const DB_VERSION = 1
const STORE = 'sessions'

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('mode', 'mode', { unique: false })
        store.createIndex('startedAt', 'startedAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const req = run(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

/** セッションを保存（同一 id は上書き）。IndexedDB 非対応環境では no-op。 */
export async function saveSession(session: Session): Promise<void> {
  if (!hasIndexedDB()) return
  await tx('readwrite', (store) => store.put(session))
}

/** 全セッションを取得（開始時刻の昇順）。 */
export async function getAllSessions(): Promise<Session[]> {
  if (!hasIndexedDB()) return []
  const all = await tx<Session[]>('readonly', (store) => store.getAll())
  return [...all].sort((a, b) => a.startedAt - b.startedAt)
}

/** 指定モードのセッションを取得。 */
export async function getSessionsByMode(mode: Mode): Promise<Session[]> {
  const all = await getAllSessions()
  return all.filter((s) => s.mode === mode)
}

/** 全セッションを削除。 */
export async function clearAllSessions(): Promise<void> {
  if (!hasIndexedDB()) return
  await tx('readwrite', (store) => store.clear())
}
