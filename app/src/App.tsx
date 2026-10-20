import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, getServer, OfflineError } from './api/client'
import type { Day, Lp, Report as ReportData, Room, Rooms as RoomsData, Session, Truck as TruckData, Week } from './api/types'
import { AccountSheet, Header, ScanOverlay, TabBar, Toast, type Tab } from './components/Chrome'
import {
  applyPendingToReport,
  applyPendingToRooms,
  applyPendingToTruck,
  applyPendingToWeek,
  clearCache,
  readCache,
  writeCache,
} from './offline/cache'
import { enqueue, flush, markOnline, pending, subscribe, type FlushResult, type SyncState } from './offline/queue'
import { stampPhoto } from './photo'
import { Report } from './screens/Report'
import { RoomDetail } from './screens/RoomDetail'
import { Rooms } from './screens/Rooms'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { isDone, Truck } from './screens/Truck'

type SignedIn = Extract<Session, { authenticated: true }>

const SCAN_MS = 900
const TOAST_MS = 2600
// At launch with no saved sign-in, wait this long for J2 before showing the sign-in screen.
const LAUNCH_CHECK_MS = 4000

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

function stampTime(d: Date) {
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '')
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')
  return `${date} ${time}`
}

// Applies queued writes over J2's answer (or the cached one) for each part of the day.
function withPending() {
  const writes = pending()
  const week = readCache<Week>('week')
  const truck = readCache<TruckData>('truck')
  const rooms = readCache<RoomsData>('rooms')
  const report = readCache<ReportData>('report')
  return {
    week: week && applyPendingToWeek(week, writes),
    truck: truck && applyPendingToTruck(truck, writes),
    rooms: rooms && applyPendingToRooms(rooms, writes),
    report: report && applyPendingToReport(report, writes),
  }
}

export default function App() {
  const [session, setSession] = useState<SignedIn | null | false>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [truck, setTruck] = useState<TruckData | null>(null)
  const [rooms, setRooms] = useState<RoomsData | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [tab, setTab] = useState<Tab>('today')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [dayIndex, setDayIndex] = useState(0)
  const [sync, setSync] = useState<SyncState>({ online: true, syncing: false, queued: 0 })
  const [toast, setToast] = useState<{ kicker: string; text: string } | null>(null)
  const [scanLabel, setScanLabel] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((kicker: string, text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ kicker, text })
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => subscribe(setSync), [])

  const showCached = useCallback(() => {
    const data = withPending()
    setWeek(data.week)
    setTruck(data.truck)
    setRooms(data.rooms)
    setReport(data.report)
    return data.week
  }, [])

  const loadData = useCallback(async () => {
    // Each part loads on its own, so one failing endpoint can't blank every tab.
    const parts = [
      ['week', api.week],
      ['truck', api.truck],
      ['rooms', api.rooms],
      ['report', api.report],
    ] as const
    const results = await Promise.allSettled(parts.map(([, load]) => load()))
    const failures: unknown[] = []
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') writeCache(parts[i][0], res.value)
      else failures.push(res.reason)
    })
    if (failures.some((err) => err instanceof ApiError && err.status === 401)) {
      writeCache('session', null)
      setSession(false)
      return null
    }
    const offline = failures.length > 0 && failures.every((err) => err instanceof OfflineError)
    markOnline(!offline)
    if (offline) setLoadError("Can't reach J2. Showing what's saved on the phone.")
    else if (failures.some((err) => err instanceof ApiError && err.status === 404)) {
      setLoadError('The server is out of date for this app. Download the latest ZIP and run start-server.bat again.')
    } else if (failures.length) setLoadError(`J2 had a problem: ${(failures[0] as Error).message}`)
    else setLoadError(null)
    return showCached()
  }, [showCached])

  const enterApp = useCallback(
    async (s: SignedIn) => {
      writeCache('session', s)
      setSession(s)
      // Show what the phone already has at once; J2's answer replaces it when it arrives.
      const cached = showCached()
      if (cached) setDayIndex(cached.today_index)
      setLoading(true)
      const w = await loadData()
      setLoading(false)
      if (w && !cached) setDayIndex(w.today_index)
      void flush()
    },
    [loadData, showCached],
  )

  // Launch never waits on the network when the phone has a saved sign-in.
  useEffect(() => {
    const cached = readCache<SignedIn>('session')
    if (cached) {
      void enterApp(cached)
      return
    }
    api
      .session(LAUNCH_CHECK_MS)
      .then((s) => (s.authenticated ? enterApp(s) : setSession(false)))
      .catch(() => {
        markOnline(false)
        setSession(false)
      })
  }, [enterApp])

  const reportFlush = useCallback(
    (result: FlushResult, label: string) => {
      if (result.needsSignIn) {
        showToast('Signed out', 'Sign in again; your updates are kept on the phone')
        writeCache('session', null)
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

  if (session === null) {
    return (
      <div className="splash">
        <img src="/pierson-logo.png" alt="Pierson" />
        <div style={{ color: 'var(--navy-muted)', fontSize: 13 }}>Connecting to J2…</div>
      </div>
    )
  }
  if (session === false) {
    return <SignIn online={sync.online} onSignedIn={(s) => s.authenticated && enterApp(s)} />
  }

  const onSite = !!week?.run.on_site_at
  const today = week?.days[week.today_index]
  const room = rooms?.rooms.find((r) => r.id === roomId) ?? null

  function setLpState(lp: Lp, state: Lp['state']) {
    setTruck((t) => t && { ...t, lps: t.lps.map((x) => (x.code === lp.code ? { ...x, state } : x)) })
  }

  function confirmLp(lp: Lp) {
    const action = onSite ? 'accept' : 'load'
    setLpState(lp, onSite ? 'accepted' : 'loaded')
    void write(`/api/field/lps/${encodeURIComponent(lp.code)}/scan/`, { action }, `${lp.code} ${onSite ? 'accepted' : 'loaded'}`)
  }

  // Simulated until the camera scanner lands: resolves to the expected code, like the prototype.
  function simulateScan(label: string, then: () => void) {
    setScanLabel(label)
    window.setTimeout(() => {
      setScanLabel(null)
      then()
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

  function updateRoom(r: Room, patch: Partial<Room>, label: string) {
    setRooms((data) => data && { ...data, rooms: data.rooms.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) })
    void write(`/api/field/rooms/${encodeURIComponent(r.id)}/`, patch, `${r.name} · ${label}`)
  }

  function setSerial(r: Room, serial: string) {
    if (r.expected_serial && serial !== r.expected_serial) {
      showToast('Serial not on the IF', `${serial} isn't the panel planned for ${r.name}`)
      return
    }
    updateRoom(r, { serial }, `SN ${serial}`)
  }

  async function takePhoto(r: Room, file: File) {
    const taken = new Date()
    try {
      const image = await stampPhoto(file, [
        `${today?.school ?? ''} · ${r.name}`,
        `${stampTime(taken)} · SN ${r.serial || 'not scanned'}`,
      ])
      setRooms((data) => data && { ...data, rooms: data.rooms.map((x) => (x.id === r.id ? { ...x, photo_url: image } : x)) })
      void write(`/api/field/rooms/${encodeURIComponent(r.id)}/photo/`, { image, taken_at: taken.toISOString() }, `${r.name} · photo`)
    } catch (err) {
      showToast('Photo not saved', (err as Error).message)
    }
  }

  function completeRoom(r: Room) {
    updateRoom(r, { done: true }, 'complete')
    setRoomId(null)
  }

  function sendReport(draft: { notes: string; return_to: ReportData['return_to']; ship_on_if: boolean }) {
    const at = new Date().toISOString()
    setReport(
      (rep) =>
        rep && { ...rep, ...draft, sent_at: at, if_status: draft.ship_on_if ? 'partially_shipped' : rep.if_status },
    )
    if (draft.return_to === 'pcci') setTruck((t) => t && { ...t, state: 'returned' })
    const label = draft.ship_on_if && report ? `Report sent · ${report.if_number} held for NetSuite` : 'Report sent'
    void write('/api/field/report/send/', { ...draft, at }, label)
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
    setRoomId(null)
    setWeek(null)
    setTruck(null)
    setRooms(null)
    setReport(null)
    setSession(false)
  }

  function openTab(t: Tab) {
    setRoomId(null)
    setTab(t)
  }

  const selected = week?.days[dayIndex]
  const lpsDone = truck ? truck.lps.filter((lp) => isDone(lp, truck.phase === 'on_site')).length : 0
  const titles: Record<Tab, [string, string]> = {
    today: [week ? `${week.customer} · Week of ${shortDate(week.days[0].date)}` : '', selected ? shortDate(selected.date, true) : 'Today'],
    truck: ['Truck load', onSite ? 'Unload on site' : 'Load at PCCi'],
    rooms: [today?.school ?? '', 'Install'],
    report: ['End of day', 'Daily report'],
  }
  const [kicker, title] = room ? [`${today?.school ?? ''} · ${week?.job_code ?? ''}`, room.name] : titles[tab]

  async function retry() {
    setLoading(true)
    await loadData()
    setLoading(false)
  }

  function screen() {
    // Each tab needs only its own data; Report also counts rooms and LPs.
    const ready = { today: week, truck, rooms, report: report && rooms && truck }[tab]
    if (!ready && !room) {
      return (
        <div className="empty">
          <div className="empty-title">{loading ? 'Loading from J2…' : "This page isn't on the phone yet"}</div>
          {!loading && (
            <>
              <div style={{ marginBottom: 14 }}>{loadError ?? 'Connect once to download it.'}</div>
              <button className="btn btn-md btn-navy" style={{ width: 'auto', padding: '0 24px' }} onClick={retry}>
                Try again
              </button>
            </>
          )}
        </div>
      )
    }
    if (room && rooms) {
      return (
        <RoomDetail
          room={room}
          scope={rooms.scope}
          walls={rooms.walls}
          onScanSerial={() => simulateScan('Scanning panel serial…', () => setSerial(room, room.expected_serial))}
          onTypeSerial={(serial) => setSerial(room, serial)}
          onHeight={(ok) => updateRoom(room, { height_ok: ok }, ok ? 'mount checked' : 'mount unchecked')}
          onWall={(wall) => updateRoom(room, { wall }, wall)}
          onPhoto={(file) => takePhoto(room, file)}
          onPacked={(packed) => updateRoom(room, { packed }, packed ? 'packaging done' : 'packaging unchecked')}
          onComplete={() => completeRoom(room)}
        />
      )
    }
    if (tab === 'today' && week) {
      return <Today week={week} dayIndex={dayIndex} onPickDay={setDayIndex} onArrive={arrive} onToggleArrivalWindow={toggleArrivalWindow} onCall={call} />
    }
    if (tab === 'truck' && truck) {
      return (
        <Truck
          truck={truck}
          onScanNext={(lp) => simulateScan(`Scanning for ${lp.code}…`, () => confirmLp(lp))}
          onConfirm={confirmLp}
        />
      )
    }
    if (tab === 'rooms' && rooms) return <Rooms data={rooms} onOpen={(r) => setRoomId(r.id)} />
    if (!report || !rooms || !truck) return null
    return (
      <Report
        key={report.sent_at ?? 'draft'}
        report={report}
        rooms={rooms}
        truck={truck}
        queued={pending().some((w) => w.path === '/api/field/report/send/')}
        onSend={sendReport}
      />
    )
  }

  return (
    <div className="shell">
      <Header
        kicker={kicker}
        title={title}
        showLogo={tab === 'today' && !room}
        sync={sync}
        initials={session.user.initials}
        onPill={syncNow}
        onAccount={() => setAccountOpen(true)}
        onBack={room ? () => setRoomId(null) : undefined}
      />
      <main className="content">
        {loadError && (week || truck || rooms) && <div className="load-banner" onClick={retry}>{loadError} Tap to retry.</div>}
        {screen()}
      </main>
      {!room && (
        <TabBar
          tab={tab}
          onTab={openTab}
          meta={{
            today: today ? shortDate(today.date) : '',
            truck: truck ? `${lpsDone}/${truck.lps.length}` : '',
            rooms: rooms ? `${rooms.rooms.filter((r) => r.done).length}/${rooms.rooms.length}` : '',
            report: report?.sent_at ? 'Sent' : '',
          }}
        />
      )}
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
