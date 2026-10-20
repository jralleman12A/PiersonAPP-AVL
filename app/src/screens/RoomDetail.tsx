import { useRef, useState } from 'react'
import { getServer } from '../api/client'
import type { Room, Scope } from '../api/types'
import { missingSteps } from './Rooms'

type Props = {
  room: Room
  scope: Scope
  walls: string[]
  onScanSerial: () => void
  onTypeSerial: (serial: string) => void
  onHeight: (ok: boolean) => void
  onWall: (wall: string) => void
  onPhoto: (file: File) => void
  onPacked: (packed: boolean) => void
  onComplete: () => void
}

function StepNumber({ n, done }: { n: number; done: boolean }) {
  return (
    <span className="step-num" style={{ background: done ? 'var(--green)' : 'var(--faint)' }}>
      {n}
    </span>
  )
}

function Check({ on }: { on: boolean }) {
  return <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
}

export function RoomDetail(props: Props) {
  const { room, scope, walls } = props
  const fileInput = useRef<HTMLInputElement>(null)
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const wall = room.wall || scope.wall_type
  const wallChanged = !!scope.wall_type && wall !== scope.wall_type
  const left = missingSteps(room).length

  function saveTyped() {
    if (!typed.trim()) return
    props.onTypeSerial(typed.trim().toUpperCase())
    setTyping(false)
    setTyped('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="card card-pad" style={{ margin: 0, padding: '14px 16px' }}>
        <div className="step-head">
          <StepNumber n={1} done={!!room.serial} />
          <span className="step-title">Scan panel serial</span>
        </div>
        {room.serial && !typing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <span className="serial-box">{room.serial}</span>
            <button className="btn-quiet" onClick={props.onScanSerial}>
              Rescan
            </button>
          </div>
        ) : typing ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              className="field-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Serial on the panel label"
              autoCapitalize="characters"
              autoCorrect="off"
              autoFocus
            />
            <button className="btn-quiet" onClick={saveTyped} disabled={!typed.trim()}>
              Save
            </button>
          </div>
        ) : (
          <button className="btn btn-md btn-navy" style={{ marginTop: 10, height: 48 }} onClick={props.onScanSerial}>
            Scan barcode
          </button>
        )}
        {!typing && (
          <button className="link-btn" onClick={() => setTyping(true)}>
            Label won't scan? Type the serial
          </button>
        )}
      </div>

      <div className="card card-pad" style={{ margin: 0, padding: '14px 16px' }}>
        <div className="step-head">
          <StepNumber n={2} done={room.height_ok} />
          <span className="step-title">Mount</span>
        </div>
        <button className="plain-row" onClick={() => props.onHeight(!room.height_ok)}>
          <Check on={room.height_ok} />
          <span>
            Hung at confirmed height
            {scope.hang_height && ` · ${scope.hang_height.charAt(0).toLowerCase()}${scope.hang_height.slice(1)}`}
          </span>
        </button>
        <div className="label" style={{ fontSize: 11, margin: '6px 0' }}>
          Wall type
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {walls.map((w) => {
            const on = w === wall
            return (
              <button key={w} className={`wall-pill ${on ? 'on' : ''}`} onClick={() => props.onWall(w)}>
                {w}
              </button>
            )
          })}
        </div>
        {wallChanged && <div className="warn-note">Differs from confirmed scope. The PM will be flagged.</div>}
      </div>

      <div className="card card-pad" style={{ margin: 0, padding: '14px 16px' }}>
        <div className="step-head" style={{ marginBottom: 10 }}>
          <StepNumber n={3} done={!!room.photo_url} />
          <span className="step-title">Photo of working panel</span>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) props.onPhoto(file)
            e.target.value = ''
          }}
        />
        <button className={`photo-tile ${room.photo_url ? 'has' : ''}`} onClick={() => fileInput.current?.click()}>
          {room.photo_url ? (
            <img src={room.photo_url.startsWith('data:') ? room.photo_url : getServer() + room.photo_url} alt={`Panel in ${room.name}`} />
          ) : (
            <span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Take photo</span>
              <br />
              <span className="muted" style={{ fontSize: 11.5 }}>
                Stamped with school, room, date and serial
              </span>
            </span>
          )}
        </button>
        {!room.serial && !room.photo_url && (
          <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            Scan the serial first so it lands in the stamp.
          </div>
        )}
      </div>

      <div className="card" style={{ margin: 0, padding: '6px 16px' }}>
        <button className="plain-row" style={{ minHeight: 52 }} onClick={() => props.onPacked(!room.packed)}>
          <StepNumber n={4} done={room.packed} />
          <span className="step-title" style={{ flex: 1 }}>
            Packaging to site dumpster
          </span>
          <Check on={room.packed} />
        </button>
      </div>

      <button
        className={`btn ${room.done ? 'btn-green' : left ? 'btn-grey' : 'btn-orange'}`}
        style={{ marginTop: 4 }}
        disabled={room.done || left > 0}
        onClick={props.onComplete}
      >
        {room.done ? 'Room complete' : left ? `${left} step${left === 1 ? '' : 's'} left` : 'Mark room complete'}
      </button>
    </div>
  )
}
