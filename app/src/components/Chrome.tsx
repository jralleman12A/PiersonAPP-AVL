import type { User } from '../api/types'
import type { SyncState } from '../offline/queue'

export type Tab = 'today' | 'truck' | 'rooms' | 'report'

export function Header(props: {
  kicker: string
  title: string
  showLogo: boolean
  sync: SyncState
  initials: string
  onPill: () => void
  onAccount: () => void
}) {
  const { sync } = props
  const dot = sync.syncing ? 'var(--amber)' : sync.online ? 'var(--green)' : 'var(--orange)'
  const label = sync.syncing
    ? `Syncing ${sync.queued}…`
    : !sync.online
      ? `Offline · ${sync.queued} queued`
      : sync.queued
        ? `${sync.queued} to sync`
        : 'J2 synced'
  return (
    <div className="header">
      <div className="header-row">
        <div className="header-text">
          {props.showLogo ? <img src="/pierson-logo.png" alt="Pierson" className="header-logo" /> : <div className="kicker">{props.kicker}</div>}
          <div className="title">{props.title}</div>
        </div>
        <button className="pill" onClick={props.onPill}>
          <span className="dot" style={{ background: dot }} />
          {label}
        </button>
        <button className="avatar" aria-label="Account" onClick={props.onAccount}>
          {props.initials}
        </button>
      </div>
    </div>
  )
}

export function TabBar(props: { tab: Tab; meta: Record<Tab, string>; onTab: (t: Tab) => void }) {
  const tabs: [Tab, string][] = [
    ['today', 'Today'],
    ['truck', 'Truck'],
    ['rooms', 'Rooms'],
    ['report', 'Report'],
  ]
  return (
    <nav className="tabbar">
      {tabs.map(([key, label]) => {
        const on = key === props.tab
        return (
          <button key={key} className="tab" onClick={() => props.onTab(key)}>
            <span className="tab-bar" style={{ background: on ? 'var(--orange)' : 'transparent' }} />
            <span className="tab-label" style={{ color: on ? 'var(--navy)' : 'var(--muted)' }}>
              {label}
            </span>
            <span className="tab-meta">{props.meta[key]}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Toast({ kicker, text }: { kicker: string; text: string }) {
  return (
    <div className="toast" role="status">
      <div className="toast-kicker">{kicker}</div>
      <div className="toast-text">{text}</div>
    </div>
  )
}

export function ScanOverlay({ label }: { label: string }) {
  return (
    <div className="scan">
      <div className="viewfinder" />
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
    </div>
  )
}

export function AccountSheet(props: {
  user: User
  method: string
  days?: number
  server: string
  queued: number
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <div className="sheet-backdrop" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{props.user.name}</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          {props.user.email}
        </div>
        <div className="sheet-row">
          <span className="muted">Role</span>
          <span className="strong">{props.user.role}</span>
        </div>
        <div className="sheet-row">
          <span className="muted">Signed in with</span>
          <span className="strong">{props.method === 'microsoft' ? 'Microsoft' : 'J2 password'}</span>
        </div>
        {props.days !== undefined && (
          <div className="sheet-row">
            <span className="muted">Session length</span>
            <span className="strong">{props.days} days</span>
          </div>
        )}
        <div className="sheet-row">
          <span className="muted">Connected to</span>
          <span className="strong">J2 WMS{props.server ? ` · ${props.server.replace(/^https?:\/\//, '')}` : ''}</span>
        </div>
        {props.queued > 0 && (
          <div className="signin-error" style={{ marginTop: 12, background: 'var(--amber-bg)', borderColor: '#fcd34d', color: 'var(--amber-ink)' }}>
            {props.queued} update{props.queued > 1 ? 's are' : ' is'} still on this phone. They stay here and send after you sign in again.
          </div>
        )}
        <div className="sheet-actions">
          <button className="btn btn-md btn-outline" style={{ width: '100%', height: 50 }} onClick={props.onClose}>
            Close
          </button>
          <button className="btn btn-md btn-orange" onClick={props.onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
