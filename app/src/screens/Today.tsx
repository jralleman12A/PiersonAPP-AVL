import type { Day, Week } from '../api/types'

type Props = {
  week: Week
  dayIndex: number
  onPickDay: (i: number) => void
  onArrive: () => void
  onToggleArrivalWindow: () => void
  onCall: (day: Day) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')
}

function statusChip(day: Day, onSite: boolean): [string, string] {
  if (day.state === 'done') return ['Complete', 'chip-grey']
  if (day.state === 'today') return onSite ? ['On site', 'chip-green'] : ['Today', 'chip-amber']
  return ['Upcoming', 'chip-navy']
}

export function Today({ week, dayIndex, onPickDay, onArrive, onToggleArrivalWindow, onCall }: Props) {
  const day = week.days[dayIndex]
  const isToday = day.state === 'today'
  const onSite = !!week.run.on_site_at
  const [status, chipClass] = statusChip(day, onSite)

  return (
    <>
      <div className="days">
        {week.days.map((d, i) => {
          const selected = i === dayIndex
          const style = {
            background: selected ? 'var(--navy)' : 'white',
            color: selected ? 'white' : d.state === 'done' ? 'var(--faint)' : 'var(--ink)',
            borderColor: d.state === 'today' ? 'var(--orange)' : selected ? 'var(--navy)' : 'var(--line)',
          }
          return (
            <button key={d.date} className="day" style={style} onClick={() => onPickDay(i)}>
              <span className="day-name">{d.day}</span>
              <span className="day-date">{Number(d.date.slice(8))}</span>
            </button>
          )
        })}
      </div>

      {isToday && week.report_time && (
        <div className="report-row">
          <span className="label" style={{ color: 'var(--muted)', fontSize: 11, flex: 1 }}>
            Report at {week.report_location}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{week.report_time}</span>
        </div>
      )}

      <div className="card">
        <div style={{ padding: '14px 16px 12px' }}>
          <div className="split">
            <span className="code">
              {week.job_code} · {week.customer}
            </span>
            <span className={`chip ${chipClass}`}>{status}</span>
          </div>
          <div className="school">{day.school}</div>
          <div className="small muted">{day.address}</div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="label">Drive</div>
            <div className="stat-value">{day.drive || '—'}</div>
          </div>
          <div className="stat">
            <div className="label">Site hours</div>
            <div className="stat-value">{day.site_hours || '—'}</div>
          </div>
          <div className="stat">
            <div className="label">Rooms</div>
            <div className="stat-value">{day.rooms}</div>
          </div>
        </div>
        {day.site_contact && (
          <div className="contact-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">Site contact</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{day.site_contact}</div>
            </div>
            <button className="btn btn-outline" onClick={() => onCall(day)}>
              Call
            </button>
          </div>
        )}
        {isToday && day.arrival_window && (
          <button className="check-row" onClick={onToggleArrivalWindow}>
            <span className={`check ${week.run.arrival_window_sent ? 'on' : ''}`}>{week.run.arrival_window_sent ? '✓' : ''}</span>
            <span style={{ flex: 1, fontSize: 13 }}>
              <b>Arrival window sent to client</b>
              <br />
              <span className="muted" style={{ fontSize: 12 }}>
                {day.arrival_window}
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="card card-pad two-col">
        <div>
          <div className="label">Crew</div>
          <div className="strong">
            {week.crew.lead} <span className="muted" style={{ fontWeight: 500 }}>lead</span>
          </div>
          <div className="small" style={{ color: 'var(--ink-2)' }}>
            {week.crew.members_note}
          </div>
        </div>
        <div>
          <div className="label">Vehicles</div>
          <div className="strong">{week.vehicles[0] ?? '—'}</div>
          {week.vehicles.slice(1).map((v) => (
            <div key={v} className="small" style={{ color: 'var(--ink-2)' }}>
              {v}
            </div>
          ))}
        </div>
      </div>

      {week.hotel && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="split-base">
            <span className="label">Hotel block</span>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {day.hotel_distance}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{week.hotel.name}</div>
          <div className="small" style={{ color: 'var(--ink-2)' }}>
            {week.hotel.rooms} rooms · Conf. {week.hotel.confirmation} · Out {week.hotel.check_out}
          </div>
        </div>
      )}

      {isToday && (
        <button className={`btn ${onSite ? 'btn-navy' : 'btn-orange'}`} onClick={onArrive}>
          {onSite ? `On site since ${formatTime(week.run.on_site_at!)} · Open rooms` : 'Arrive on site'}
        </button>
      )}
    </>
  )
}
