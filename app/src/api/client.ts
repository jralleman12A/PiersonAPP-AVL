import { Capacitor } from '@capacitor/core'
import type { Session, Truck, Week } from './types'

const SERVER_KEY = 'avl.server'

// Thrown when the phone can't reach J2 at all, as opposed to J2 saying no.
export class OfflineError extends Error {}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isNative = Capacitor.isNativePlatform()

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// In the browser the Vite proxy makes J2 same-origin, so the address is empty.
// In the APK it is the laptop (or J2) address typed on the sign-in screen.
export function getServer(): string {
  return readStorage(SERVER_KEY) ?? ''
}

export function setServer(address: string) {
  const clean = address.trim().replace(/\/+$/, '')
  const withScheme = clean && !/^https?:\/\//.test(clean) ? `http://${clean}` : clean
  try {
    localStorage.setItem(SERVER_KEY, withScheme)
  } catch {
    // Storage blocked: the address lasts until the app closes.
  }
  return withScheme
}

export function needsServer() {
  return isNative && !getServer()
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(getServer() + path, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new OfflineError('No connection to J2')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `J2 answered ${res.status}`)
  return data as T
}

export const api = {
  session: () => request<Session>('GET', '/api/auth/session/'),
  login: (username: string, password: string) =>
    request<Session>('POST', '/api/auth/login/', { username, password }),
  logout: () => request<Session>('POST', '/api/auth/logout/'),
  week: () => request<Week>('GET', '/api/field/week/'),
  truck: () => request<Truck>('GET', '/api/field/truck/'),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
}

// J2 runs the Entra flow and sends the crew back to `next` with a session cookie.
export function microsoftSignInUrl() {
  const back = window.location.origin + '/'
  return `${getServer()}/auth/microsoft/?next=${encodeURIComponent(back)}`
}
