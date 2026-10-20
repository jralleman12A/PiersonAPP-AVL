// Shapes returned by J2's field API. Contract: docs/api.md.

export type User = {
  name: string
  email: string
  initials: string
  role: string
}

export type Session =
  | { authenticated: false }
  | { authenticated: true; user: User; method: 'microsoft' | 'password'; expires_in_days?: number }

export type DayState = 'done' | 'today' | 'upcoming'

export type Day = {
  day: string
  date: string
  school: string
  address: string
  drive: string
  site_hours: string
  rooms: number
  site_contact: string
  site_phone: string
  arrival_window: string
  hotel_distance: string
  state: DayState
}

export type RunProgress = {
  on_site_at: string | null
  arrival_window_sent: boolean
}

export type Week = {
  job_code: string
  customer: string
  report_time: string
  report_location: string
  days: Day[]
  today_index: number
  crew: { lead: string; members_note: string }
  vehicles: string[]
  hotel: { name: string; rooms: number; confirmation: string; check_out: string } | null
  run: RunProgress
}

export type LpState = 'staged' | 'loaded' | 'accepted'

export type Lp = {
  code: string
  description: string
  state: LpState
}

export type Truck = {
  truck: string
  departs: string
  stop_number: number
  state: 'loading' | 'in_transit' | 'returned'
  phase: 'loading' | 'on_site'
  school: string
  lps: Lp[]
}

export type Scope = {
  overview: string
  storage: string
  hang_height: string
  wall_type: string
  packaging: string
}

export type Room = {
  id: string
  name: string
  expected_serial: string
  serial: string
  height_ok: boolean
  wall: string
  photo_url: string | null
  photo_taken_at: string | null
  packed: boolean
  done: boolean
}

export type Rooms = {
  scope: Scope
  walls: string[]
  rooms: Room[]
}

export type Report = {
  so_number: string
  if_number: string
  panels_this_week: number
  if_status: 'open' | 'partially_shipped' | 'shipped'
  netsuite_sync: string | null
  sent_at: string | null
  notes: string
  return_to: 'hotel' | 'pcci'
  ship_on_if: boolean
}
