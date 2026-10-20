import { useState } from 'react'
import { api, ApiError, getServer, isNative, microsoftSignInUrl, OfflineError, setServer } from '../api/client'
import type { Session } from '../api/types'

type Props = {
  online: boolean
  onSignedIn: (session: Session) => void
}

export function SignIn({ online, onSignedIn }: Props) {
  const [server, setServerField] = useState(getServer())
  const [editingServer, setEditingServer] = useState(isNative && !getServer())
  const [showPw, setShowPw] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const serverReady = !isNative || !!getServer()

  function saveServer() {
    setServerField(setServer(server))
    setEditingServer(false)
    setError('')
  }

  function signInMicrosoft() {
    if (!online) {
      setError('First sign-in needs a connection. Once signed in, the app keeps working offline.')
      return
    }
    window.location.href = microsoftSignInUrl()
  }

  async function signInPassword() {
    setBusy(true)
    setError('')
    try {
      onSignedIn(await api.login(username, password))
    } catch (err) {
      if (err instanceof OfflineError) setError(`Can't reach J2${getServer() ? ` at ${getServer()}` : ''}. Check the server address and your connection.`)
      else if (err instanceof ApiError) setError(err.message)
      else setError('Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin">
      <div>
        <img src="/pierson-logo.png" alt="Pierson" className="signin-logo" />
        <div className="signin-title">AVL Field</div>
        <div className="signin-sub">Project week, truck, rooms and daily report for install crews.</div>
      </div>

      <div className="signin-stack">
        {error && <div className="signin-error">{error}</div>}

        {editingServer ? (
          <>
            <input
              className="signin-input"
              value={server}
              onChange={(e) => setServerField(e.target.value)}
              placeholder="Server, e.g. 100.101.102.103:8000"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button className="btn white-btn" onClick={saveServer} disabled={!server.trim()}>
              Save server
            </button>
          </>
        ) : (
          <>
            {showPw && (
              <>
                <input className="signin-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="J2 username" autoCapitalize="off" autoCorrect="off" />
                <input className="signin-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
                <button className="btn white-btn" onClick={signInPassword} disabled={busy || !username || !password}>
                  {busy ? 'Signing in…' : 'Sign in with password'}
                </button>
              </>
            )}
            <button className="btn btn-orange ms-btn" onClick={signInMicrosoft} disabled={!serverReady}>
              <span className="ms-mark" aria-hidden="true">
                <span style={{ background: '#f25022' }} />
                <span style={{ background: '#7fba00' }} />
                <span style={{ background: '#00a4ef' }} />
                <span style={{ background: '#ffb900' }} />
              </span>
              Sign in with Microsoft
            </button>
            <button className="text-btn" onClick={() => setShowPw(!showPw)}>
              {showPw ? 'Hide password sign-in' : 'Use J2 username and password'}
            </button>
          </>
        )}

        <div className="footer-note">
          Pierson Wireless · J2 WMS
          {isNative && !editingServer && (
            <>
              {' · '}
              <button className="text-btn" style={{ padding: 0, fontSize: 11.5 }} onClick={() => setEditingServer(true)}>
                {getServer() || 'set server'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
