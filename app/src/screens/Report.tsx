import { useState } from 'react'
import type { Report as ReportData, Rooms, Truck } from '../api/types'
import { missingSteps } from './Rooms'

type Props = {
  report: ReportData
  rooms: Rooms
  truck: Truck
  queued: boolean
  onSend: (draft: { notes: string; return_to: ReportData['return_to']; ship_on_if: boolean }) => void
}

const IF_STATUS: Record<ReportData['if_status'], [string, string]> = {
  open: ['Open', 'chip-navy'],
  partially_shipped: ['Partially shipped', 'chip-amber'],
  shipped: ['Shipped', 'chip-green'],
}

export function Report({ report, rooms, truck, queued, onSend }: Props) {
  const [notes, setNotes] = useState(report.notes)
  const [returnTo, setReturnTo] = useState<ReportData['return_to']>(report.return_to)
  const [shipOnIf, setShipOnIf] = useState(report.ship_on_if)
  const sent = !!report.sent_at

  const done = rooms.rooms.filter((r) => r.done).length
  const serials = rooms.rooms.filter((r) => r.serial).length
  const accepted = truck.lps.filter((lp) => lp.state === 'accepted').length
  const open = rooms.rooms.filter((r) => !r.done)
  const [ifLabel, ifChip] = IF_STATUS[report.if_status]

  const stats: [string, string][] = [
    [`${done}/${rooms.rooms.length}`, 'Rooms done'],
    [String(serials), 'Serials'],
    [`${accepted}/${truck.lps.length}`, 'LPs accepted'],
  ]

  return (
    <>
      <div className="stat-tiles">
        {stats.map(([value, label]) => (
          <div key={label} className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="report-row" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label">Item fulfillment · {report.so_number}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>{report.if_number}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {serials} of {report.panels_this_week} ActivPanels serialized this week · {accepted} of {truck.lps.length} LPs accepted today
          </div>
        </div>
        <span className={`chip ${ifChip}`} style={{ padding: '4px 8px' }}>
          {ifLabel}
        </span>
      </div>

      <div className="label" style={{ fontSize: 11, marginBottom: 6 }}>
        Panels recorded
      </div>
      <div className="card" style={{ padding: '4px 14px', marginBottom: 16, borderRadius: 12 }}>
        {rooms.rooms.map((r) => (
          <div key={r.id} className="list-line">
            <span style={{ flex: 1, fontWeight: 700 }}>{r.name}</span>
            <span style={{ fontFamily: 'var(--mono)', color: r.serial ? 'var(--ink)' : '#cbd5e1' }}>{r.serial || '—'}</span>
          </div>
        ))}
      </div>

      {open.length > 0 && (
        <>
          <div className="label" style={{ fontSize: 11, marginBottom: 6 }}>
            Open items
          </div>
          {open.map((r) => {
            const missing = missingSteps(r)
            return (
              <div key={r.id} className="open-line">
                <b>{r.name}</b> · {missing.length ? missing.join(', ') : 'not marked complete'}
              </div>
            )
          })}
        </>
      )}

      <div style={{ fontSize: 13, fontWeight: 800, margin: '16px 0 6px' }}>Notes for the PM</div>
      <textarea
        className="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What's left, what's needed, access issues"
        disabled={sent}
      />

      <div style={{ fontSize: 13, fontWeight: 800, margin: '14px 0 6px' }}>Heading to</div>
      <div className="segmented">
        {(
          [
            ['hotel', 'Hotel'],
            ['pcci', 'PCCi'],
          ] as const
        ).map(([value, label]) => (
          <button key={value} className={returnTo === value ? 'on' : ''} onClick={() => setReturnTo(value)} disabled={sent}>
            {label}
          </button>
        ))}
      </div>

      <button className="plain-row boxed" onClick={() => setShipOnIf(!shipOnIf)} disabled={sent}>
        <span className={`check ${shipOnIf ? 'on' : ''}`}>{shipOnIf ? '✓' : ''}</span>
        <span>Ship today's accepted LPs and serials on the IF</span>
      </button>

      <button
        className={`btn ${sent ? 'btn-green' : 'btn-orange'}`}
        style={{ marginTop: 14 }}
        disabled={sent}
        onClick={() => onSend({ notes, return_to: returnTo, ship_on_if: shipOnIf })}
      >
        {!sent ? 'Send report' : queued ? 'Report queued · sends when online' : 'Report sent to the PM'}
      </button>
    </>
  )
}
