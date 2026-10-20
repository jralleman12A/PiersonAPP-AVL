import type { QueuedWrite } from './queue'
import type { Truck, Week } from '../api/types'

// The last plan J2 sent, so the app opens on a job site with no signal.

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`avl.cache.${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(`avl.cache.${key}`, JSON.stringify(value))
  } catch {
    // Storage blocked or full: the app still works while open.
  }
}

export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('avl.cache.'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // Nothing cached.
  }
}

// Writes still on the phone are laid over J2's answer, so a refresh never undoes them.
export function applyPendingToTruck(truck: Truck, writes: readonly QueuedWrite[]): Truck {
  let lps = truck.lps
  for (const w of writes) {
    const m = w.path.match(/^\/api\/field\/lps\/([^/]+)\/scan\/$/)
    if (!m) continue
    const code = decodeURIComponent(m[1])
    lps = lps.map((lp) => {
      if (lp.code !== code) return lp
      if (w.body.action === 'accept') return { ...lp, state: 'accepted' }
      return lp.state === 'staged' ? { ...lp, state: 'loaded' } : lp
    })
  }
  const arrived = writes.some((w) => w.path === '/api/field/arrive/')
  return {
    ...truck,
    lps,
    phase: arrived ? 'on_site' : truck.phase,
    state: arrived && truck.state === 'loading' ? 'in_transit' : truck.state,
  }
}

export function applyPendingToWeek(week: Week, writes: readonly QueuedWrite[]): Week {
  let run = week.run
  for (const w of writes) {
    if (w.path === '/api/field/arrive/' && !run.on_site_at) {
      run = { ...run, on_site_at: String(w.body.at ?? new Date().toISOString()) }
    }
    if (w.path === '/api/field/arrival-window/') {
      run = { ...run, arrival_window_sent: Boolean(w.body.sent) }
    }
  }
  return { ...week, run }
}
