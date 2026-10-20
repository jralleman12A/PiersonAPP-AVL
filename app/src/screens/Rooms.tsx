import type { Room, Rooms as RoomsData } from '../api/types'

export const STEPS = 4

export function missingSteps(room: Room) {
  const steps: [string, unknown][] = [
    ['serial', room.serial],
    ['mount check', room.height_ok],
    ['photo', room.photo_url],
    ['packaging', room.packed],
  ]
  return steps.filter(([, ok]) => !ok).map(([name]) => name)
}

function progress(room: Room): [string, string] {
  const done = STEPS - missingSteps(room).length
  if (room.done) return [`Complete · ${room.serial}`, 'var(--green)']
  if (done) return [`${done} of ${STEPS} steps`, 'var(--amber)']
  return ['Not started', '#cbd5e1']
}

export function Rooms({ data, onOpen }: { data: RoomsData; onOpen: (room: Room) => void }) {
  const { scope, rooms } = data
  const doneCount = rooms.filter((r) => r.done).length
  const facts: [string, string][] = [
    ['Storage', scope.storage],
    ['Hang height', scope.hang_height],
    ['Wall type', scope.wall_type],
    ['Packaging', scope.packaging],
  ]
  return (
    <>
      <div className="scope-card">
        <div className="split-base">
          <span className="scope-kicker">Confirmed scope</span>
          <span style={{ fontSize: 11, color: 'var(--navy-muted)' }}>by the PM in J2</span>
        </div>
        {scope.overview && <div className="scope-text">{scope.overview}</div>}
        <div className="scope-grid">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <div className="scope-label">{label}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="split-base" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>Rooms</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {doneCount} of {rooms.length} complete
        </span>
      </div>
      {rooms.map((room) => {
        const [line, dot] = progress(room)
        return (
          <button key={room.id} className="lp-row" onClick={() => onOpen(room)}>
            <span className="dot" style={{ width: 10, height: 10, background: dot, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 14.5 }}>{room.name}</span>
              <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                {line}
              </span>
            </span>
            <span style={{ color: 'var(--faint)', fontSize: 20 }}>›</span>
          </button>
        )
      })}
    </>
  )
}
