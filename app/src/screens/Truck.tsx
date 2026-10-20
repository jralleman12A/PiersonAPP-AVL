import type { Lp, LpState, Truck as TruckData } from '../api/types'

type Props = {
  truck: TruckData
  onScanNext: (lp: Lp) => void
  onConfirm: (lp: Lp) => void
}

const STATUS: Record<LpState, [string, string]> = {
  staged: ['Staged', 'chip-grey'],
  loaded: ['Loaded', 'chip-navy'],
  accepted: ['Accepted', 'chip-green'],
}

const RUN_STATE: Record<TruckData['state'], [string, string]> = {
  loading: ['Loading', 'chip-amber'],
  in_transit: ['In transit', 'chip-navy'],
  returned: ['Returned', 'chip-grey'],
}

// Before arrival the goal is "loaded"; on site it is "accepted".
export function isDone(lp: Lp, onSite: boolean) {
  return onSite ? lp.state === 'accepted' : lp.state !== 'staged'
}

function nextLp(truck: TruckData) {
  const onSite = truck.phase === 'on_site'
  return truck.lps.find((lp) => !isDone(lp, onSite))
}

export function Truck({ truck, onScanNext, onConfirm }: Props) {
  const onSite = truck.phase === 'on_site'
  const done = truck.lps.filter((lp) => isDone(lp, onSite)).length
  const total = truck.lps.length
  const next = nextLp(truck)
  const [runLabel, runChip] = RUN_STATE[truck.state]

  return (
    <>
      <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div className="split-base">
          <span className="label">{onSite ? `Accepted at ${truck.school}` : 'Loaded at PCCi'}</span>
          <span className={`chip ${runChip}`}>{runLabel}</span>
        </div>
        <div className="big-count">
          {done} of {total} LPs
        </div>
        <div className="progress">
          <div style={{ width: total ? `${Math.round((done / total) * 100)}%` : '0%' }} />
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {truck.truck} · departs {truck.departs} · Stop {truck.stop_number} · LP allocations from J2
        </div>
        <button
          className={`btn btn-md ${next ? 'btn-navy' : 'btn-green'}`}
          style={{ marginTop: 12 }}
          disabled={!next}
          onClick={() => next && onScanNext(next)}
        >
          {next ? `Scan next · ${next.code}` : onSite ? 'All LPs accepted' : 'Truck fully loaded'}
        </button>
      </div>

      {truck.lps.map((lp) => {
        const [label, chip] = STATUS[lp.state]
        return (
          <button key={lp.code} className="lp-row" onClick={() => onConfirm(lp)} disabled={isDone(lp, onSite)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="lp-code">{lp.code}</span>
              <span className="lp-desc">{lp.description}</span>
            </span>
            <span className={`chip ${chip}`} style={{ padding: '4px 8px' }}>
              {label}
            </span>
          </button>
        )
      })}
      <div className="hint">Tap a row to confirm without scanning.</div>
    </>
  )
}
