import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, getServer, OfflineError } from './api/client'
import type { Day, Lp, Session, Truck as TruckData, Week } from './api/types'
import { AccountSheet, Header, ScanOverlay, TabBar, Toast, type Tab } from './components/Chrome'
import { applyPendingToTruck, applyPendingToWeek, clearCache, readCache, writeCache } from './offline/cache'
import { enqueue, flush, markOnline, pending, subscribe, type FlushResult, type SyncState } from './offline/queue'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { isDone, Truck } from './screens/Truck'

type SignedIn = Extract<Session, { authenticated: true }>

const SCAN_MS = 900
const TOAST_MS = 2600

function localDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function shortDate(iso: string, withWeekday = false) {
  return localDate(iso).toLocaleDateString('en-US', {
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
  })
}

export default function App() {
  const [session, setSession] = useState<SignedIn | null | false>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [truck, setTruck] = useState<TruckData | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [dayIndex, setDayIndex] = useState(0)
  const [sync, setSync] = useState<SyncState>({ online: true, syncing: false, queued: 0 })
  const [toast, setToast] = useState<{ kicker: string; text: string } | null>(null)
  const [scanLabel, setScanLabel] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((kicker: string, text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ kicker, text })
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => subscribe(setSync), [])

  const loadData = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([api.week(), api.truck()])
      writeCache('week', w)
      writeCache('truck', t)
      markOnline(true)
      setWeek(applyPendingToWeek(w, pending()))
      setTruck(applyPendingToTruck(t, pending()))
      return w
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(false)
        return null
      }
      if (err instanceof OfflineError) markOnline(false)
      const w = readCache<Week>('week')
      const t = readCache<TruckData>('truck')
      if (w) setWeek(applyPendingToWeek(w, pending()))
      if (t) setTruck(applyPendingToTruck(t, pending()))
      return w
    }
  }, [])

  const enterApp = useCallback(
    async (s: SignedIn) => {
      writeCache('session', s)
      setSession(s)
      const w = await loadData()
      if (w) setDayIndex(w.today_index)
      void flush()
    },
    [loadData],
  )

  // On launch: a valid J2 session skips sign-in. With no signal, trust the last one.
  useEffect(() => {
    api
      .session()
      .then((s) => (s.authenticated ? enterApp(s) : setSession(false)))
      .catch(() => {
        const cached = readCache<SignedIn>('session')
        markOnline(false)
        if (cached) void enterApp(cached)
        else setSession(false)
      })
  }, [enterApp])

  const reportFlush = useCallback(
    (result: FlushResult, label: string) => {
      if (result.needsSignIn) {
        setSession(false)
        return
      }
      if (result.rejected.length) {
        showToast('J2 refused an update', result.rejected[0])
        void loadData()
        return
      }
      if (pending().length) showToast('Saved on phone', `${label} · syncs when back online`)
      else showToast('Synced to J2', label)
    },
    [loadData, showToast],
  )

  const write = useCallback(
    async (path: string, body: Record<string, unknown>, label: string) => {
      reportFlush(await enqueue(path, body, label), label)
    },
    [reportFlush],
  )

  if (session === null) return <div className="signin" />
  if (session === false) {
    return <SignIn online={sync.online} onSignedIn={(s) => s.authenticated && enterApp(s)} />
  }

  const onSite = !!week?.run.on_site_at

  function setLpState(lp: Lp, state: Lp['state']) {
    setTruck((t) => t && { ...t, lps: t.lps.map((x) => (x.code === lp.code ? { ...x, state } : x)) })
  }

  function confirmLp(lp: Lp) {
    const action = onSite ? 'accept' : 'load'
    setLpState(lp, onSite ? 'accepted' : 'loaded')
    void write(`/api/field/lps/${encodeURIComponent(lp.code)}/scan/`, { action }, `${lp.code} ${onSite ? 'accepted' : 'loaded'}`)
  }

  function scanNext(lp: Lp) {
    // Simulated until the camera scanner lands: resolves to the next LP, like the prototype.
    setScanLabel(`Scanning for ${lp.code}…`)
    window.setTimeout(() => {
      setScanLabel(null)
      confirmLp(lp)
    }, SCAN_MS)
  }

  function arrive() {
    if (onSite) {
      setTab('rooms')
      return
    }
    const at = new Date().toISOString()
    setWeek((w) => w && { ...w, run: { ...w.run, on_site_at: at } })
    setTruck((t) => t && { ...t, phase: 'on_site', state: 'in_transit' })
    setTab('truck')
    void write('/api/field/arrive/', { at }, 'Arrived on site')
  }

  function toggleArrivalWindow() {
    const sent = !week?.run.arrival_window_sent
    setWeek((w) => w && { ...w, run: { ...w.run, arrival_window_sent: sent } })
    void write('/api/field/arrival-window/', { sent }, sent ? 'Arrival window sent' : 'Arrival window unchecked')
  }

  function call(day: Day) {
    if (day.site_phone) window.location.href = `tel:${day.site_phone}`
    else showToast('No number yet', `${day.site_contact} has no phone number in J2`)
  }

  async function syncNow() {
    if (!sync.queued) {
      showToast(sync.online ? 'J2 synced' : 'Offline', sync.online ? 'Nothing waiting to send' : 'Work keeps saving on the phone')
      void loadData()
      return
    }
    const before = sync.queued
    const result = await flush()
    if (result.sent) showToast('Synced to J2', `${result.sent} of ${before} queued update${before > 1 ? 's' : ''} sent`)
    else reportFlush(result, 'Still offline')
  }

  async function signOut() {
    try {
      await api.logout()
    } catch {
      // Offline: the server session ends on its own; the phone forgets it now.
    }
    clearCache()
    setAccountOpen(false)
    setWeek(null)
    setTruck(null)
    setSession(false)
  }

  const today = week?.days[week.today_index]
  const selected = week?.days[dayIndex]
  const lpsDone = truck ? truck.lps.filter((lp) => isDone(lp, truck.phase === 'on_site')).length : 0
  const titles: Record<Tab, [string, string]> = {
    today: [week ? `${week.customer} · Week of ${shortDate(week.days[0].date)}` : '', selected ? shortDate(selected.date, true) : 'Today'],
    truck: ['Truck load', onSite ? 'Unload on site' : 'Load at PCCi'],
    rooms: [today?.school ?? '', 'Install'],
    report: ['End of day', 'Daily report'],
  }
  const [kicker, title] = titles[tab]

  return (
    <div className="shell">
      <Header
        kicker={kicker}
        title={title}
        showLogo={tab === 'today'}
        sync={sync}
        initials={session.user.initials}
        onPill={syncNow}
        onAccount={() => setAccountOpen(true)}
      />
      <main className="content">
        {!week || !truck ? (
          <div className="empty">
            <div className="empty-title">{sync.online ? 'Loading from J2…' : 'No plan on this phone yet'}</div>
            {!sync.online && <div>Connect once to download this week's plan.</div>}
          </div>
        ) : tab === 'today' ? (
          <Today week={week} dayIndex={dayIndex} onPickDay={setDayIndex} onArrive={arrive} onToggleArrivalWindow={toggleArrivalWindow} onCall={call} />
        ) : tab === 'truck' ? (
          <Truck truck={truck} onScanNext={scanNext} onConfirm={confirmLp} />
        ) : (
          <div className="empty">
            <div className="empty-title">{tab === 'rooms' ? 'Rooms' : 'Daily report'} comes in the next build</div>
            <div>Today and Truck are ready to try.</div>
          </div>
        )}
      </main>
      <TabBar
        tab={tab}
        onTab={setTab}
        meta={{
          today: today ? shortDate(today.date) : '',
          truck: truck ? `${lpsDone}/${truck.lps.length}` : '',
          rooms: today ? `0/${today.rooms}` : '',
          report: '',
        }}
      />
      {toast && <Toast kicker={toast.kicker} text={toast.text} />}
      {scanLabel && <ScanOverlay label={scanLabel} />}
      {accountOpen && (
        <AccountSheet
          user={session.user}
          method={session.method}
          days={session.expires_in_days}
          server={getServer()}
          queued={sync.queued}
          onClose={() => setAccountOpen(false)}
          onSignOut={signOut}
        />
      )}
    </div>
  )
}
