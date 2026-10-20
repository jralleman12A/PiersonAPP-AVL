import type { QueuedWrite } from './queue'
import type { Report, Rooms, Truck, Week } from '../api/types'

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
  const report = writes.find((w) => w.path === '/api/field/report/send/')
  let state = arrived && truck.state === 'loading' ? 'in_transit' : truck.state
  if (report?.body.return_to === 'pcci') state = 'returned'
  return { ...truck, lps, phase: arrived ? 'on_site' : truck.phase, state }
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

export function applyPendingToRooms(rooms: Rooms, writes: readonly QueuedWrite[]): Rooms {
  let list = rooms.rooms
  for (const w of writes) {
    const photo = w.path.match(/^\/api\/field\/rooms\/([^/]+)\/photo\/$/)
    const step = w.path.match(/^\/api\/field\/rooms\/([^/]+)\/$/)
    if (photo) {
      // Until it syncs, show the stamped photo held in the queue.
      list = list.map((r) =>
        r.id === photo[1] ? { ...r, photo_url: String(w.body.image), photo_taken_at: String(w.body.taken_at) } : r,
      )
    } else if (step) {
      list = list.map((r) => (r.id === step[1] ? { ...r, ...w.body } : r))
    }
  }
  return { ...rooms, rooms: list }
}

export function applyPendingToReport(report: Report, writes: readonly QueuedWrite[]): Report {
  const sent = writes.find((w) => w.path === '/api/field/report/send/')
  if (!sent) return report
  const body = sent.body as { notes: string; return_to: Report['return_to']; ship_on_if: boolean; at: string }
  return {
    ...report,
    notes: body.notes,
    return_to: body.return_to,
    ship_on_if: body.ship_on_if,
    sent_at: body.at,
    if_status: body.ship_on_if ? 'partially_shipped' : report.if_status,
  }
}
