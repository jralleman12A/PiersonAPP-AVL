import { api, ApiError, OfflineError } from '../api/client'

// Every write is saved on the phone first, then sent to J2 in order.
// The request_key lets J2 ignore a write it already applied (a retry after a dropped reply).

export type QueuedWrite = {
  request_key: string
  path: string
  body: Record<string, unknown>
  label: string
}

export type SyncState = {
  online: boolean
  syncing: boolean
  queued: number
}

export type FlushResult = { sent: number; rejected: string[]; needsSignIn: boolean }

const QUEUE_KEY = 'avl.queue'
const RETRY_MS = 15000

let queue: QueuedWrite[] = load()
let state: SyncState = { online: navigator.onLine, syncing: false, queued: queue.length }
let flushing: Promise<FlushResult> | null = null
const listeners = new Set<(s: SyncState) => void>()

function load(): QueuedWrite[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Storage blocked: the queue still lives in memory until the app closes.
  }
}

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch, queued: queue.length }
  listeners.forEach((fn) => fn(state))
}

function newKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function subscribe(fn: (s: SyncState) => void) {
  listeners.add(fn)
  fn(state)
  return () => {
    listeners.delete(fn)
  }
}

export function pending(): readonly QueuedWrite[] {
  return queue
}

export function enqueue(path: string, body: Record<string, unknown>, label: string) {
  queue = [...queue, { request_key: newKey(), path, body, label }]
  save()
  set({})
  return flush()
}

export function flush(): Promise<FlushResult> {
  flushing ??= run().finally(() => {
    flushing = null
  })
  return flushing
}

async function run(): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, rejected: [], needsSignIn: false }
  if (!queue.length) return result
  set({ syncing: true })
  while (queue.length) {
    const item = queue[0]
    try {
      await api.post(item.path, { ...item.body, request_key: item.request_key })
      result.sent++
    } catch (err) {
      if (err instanceof OfflineError) {
        set({ online: false, syncing: false })
        return result
      }
      if (err instanceof ApiError && err.status === 401) {
        // Signed out: keep the writes on the phone until the next sign-in.
        result.needsSignIn = true
        set({ syncing: false })
        return result
      }
      // J2 refused this write, so retrying won't help. Drop it and tell the crew.
      result.rejected.push(`${item.label}: ${(err as Error).message}`)
    }
    queue = queue.slice(1)
    save()
    set({})
  }
  set({ online: true, syncing: false })
  return result
}

export function markOnline(online: boolean) {
  set({ online })
}

window.addEventListener('online', () => {
  set({ online: true })
  void flush()
})
window.addEventListener('offline', () => set({ online: false }))
setInterval(() => {
  if (queue.length) void flush()
}, RETRY_MS)
