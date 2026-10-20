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
