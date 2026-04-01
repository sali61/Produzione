import { type FormEvent, useEffect, useState } from 'react'
import './App.css'

type CurrentUser = {
  idRisorsa: number
  username: string
  fullName: string
  ou: string
  ouScopes: string[]
  roles: string[]
  profiles?: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  impersonatedUsername?: string | null
  impersonatorUsername?: string | null
  authenticatedIdRisorsa?: number
  authenticatedUsername?: string
  authenticatedRoles?: string[]
  authenticatedOuScopes?: string[]
}

type AvailableProfilesResponse = {
  profiles: string[]
  ouScopes: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  authenticatedUsername?: string
  effectiveUsername?: string
}

type SessionProbeResult =
  | { state: 'ok'; user: CurrentUser }
  | { state: 'unauthorized' }
  | { state: 'forbidden'; message: string }
  | { state: 'error'; message: string }

type MenuKey = 'user'

const tokenStorageKey = 'produzione.jwt'
const redirectGuardKey = 'produzione.sso.redirecting'
const impersonationStorageKey = 'produzione.sso.actas'
const impersonationHeaderName = 'X-Act-As-Username'

function App() {
  const [token, setToken] = useState('')
  const [apiHealth, setApiHealth] = useState('n/d')
  const [statusMessage, setStatusMessage] = useState('Inizializzazione sessione.')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [profiles, setProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [ouScopes, setOuScopes] = useState<string[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [isRedirectingToAuth, setIsRedirectingToAuth] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [activeImpersonation, setActiveImpersonation] = useState('')
  const [impersonationInput, setImpersonationInput] = useState('')
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false)

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_BASE_URL ?? '').replace(/\/$/, '')
  const authPortalBaseUrl = (import.meta.env.VITE_AUTH_PORTAL_URL ?? 'https://localhost:5043').replace(/\/$/, '')
  const toBackendUrl = (path: string) => `${backendBaseUrl}${path}`
  const currentProfile = selectedProfile || profiles[0] || ''
  const authenticatedRoles = user?.authenticatedRoles ?? user?.roles ?? []
  const canImpersonate = user?.canImpersonate ?? false
  const isImpersonating = user?.isImpersonating ?? false

  const saveToken = (value: string) => {
    const trimmed = value.trim()
    setToken(trimmed)

    if (trimmed) {
      localStorage.setItem(tokenStorageKey, trimmed)
      return
    }

    localStorage.removeItem(tokenStorageKey)
  }

  const clearSession = () => {
    saveToken('')
    setUser(null)
    setProfiles([])
    setSelectedProfile('')
    setOuScopes([])
    setActiveImpersonation('')
    sessionStorage.removeItem(impersonationStorageKey)
  }

  const buildReturnUrl = () => {
    const currentUrl = new URL(window.location.href)
    const query = new URLSearchParams(currentUrl.search)
    query.delete('token')
    query.delete('expiresAtUtc')

    const queryString = query.toString()
    return queryString
      ? `${currentUrl.origin}${currentUrl.pathname}?${queryString}`
      : `${currentUrl.origin}${currentUrl.pathname}`
  }

  const redirectToCentralAuth = (reason: string) => {
    if (isRedirectingToAuth) {
      return
    }

    if (sessionStorage.getItem(redirectGuardKey) === '1') {
      return
    }

    setIsRedirectingToAuth(true)
    setStatusMessage('Reindirizzamento verso autenticazione centralizzata...')
    sessionStorage.setItem(redirectGuardKey, '1')

    const authUrl = new URL(authPortalBaseUrl)
    authUrl.searchParams.set('returnUrl', buildReturnUrl())
    authUrl.searchParams.set('client', 'produzione')
    authUrl.searchParams.set('reason', reason)
    window.location.replace(authUrl.toString())
  }

  const authHeaders = (jwt = token, impersonationUsername = activeImpersonation) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${jwt.trim()}`,
    }

    const normalizedImpersonation = impersonationUsername.trim()
    if (normalizedImpersonation) {
      headers[impersonationHeaderName] = normalizedImpersonation
    }

    return headers
  }

  const readApiMessage = async (response: Response) => {
    try {
      const payload = (await response.json()) as { message?: string; title?: string }
      if (payload.message?.trim()) {
        return payload.message.trim()
      }

      if (payload.title?.trim()) {
        return payload.title.trim()
      }
    } catch {
      return ''
    }

    return ''
  }

  const syncImpersonationFromUser = (payload: CurrentUser) => {
    const impersonated = payload.isImpersonating && payload.impersonatedUsername
      ? payload.impersonatedUsername.trim()
      : ''

    if (impersonated) {
      setActiveImpersonation(impersonated)
      setImpersonationInput(impersonated)
      sessionStorage.setItem(impersonationStorageKey, impersonated)
      return
    }

    setActiveImpersonation('')
    sessionStorage.removeItem(impersonationStorageKey)
  }

  const loadHealth = async () => {
    const response = await fetch(toBackendUrl('/api/system/health'))
    setApiHealth(response.ok ? 'OK' : `KO (${response.status})`)
  }

  const loadCurrentUser = async (
    jwt: string,
    impersonationUsername: string,
  ): Promise<SessionProbeResult> => {
    if (!jwt.trim()) {
      return { state: 'unauthorized' }
    }

    const response = await fetch(toBackendUrl('/api/system/me'), {
      headers: authHeaders(jwt, impersonationUsername),
    })

    if (response.status === 401) {
      return { state: 'unauthorized' }
    }

    if (response.status === 403) {
      const message = await readApiMessage(response)
      return {
        state: 'forbidden',
        message: message || 'Utente autenticato ma non abilitato su Produzione.',
      }
    }

    if (!response.ok) {
      const message = await readApiMessage(response)
      return {
        state: 'error',
        message: message || `Errore verifica contesto utente (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CurrentUser
    setUser(payload)
    syncImpersonationFromUser(payload)
    return { state: 'ok', user: payload }
  }

  const loadProfiles = async (jwt: string, impersonationUsername: string) => {
    const response = await fetch(toBackendUrl('/api/profiles/available'), {
      headers: authHeaders(jwt, impersonationUsername),
    })

    if (response.status === 401) {
      clearSession()
      redirectToCentralAuth('stale_token')
      return false
    }

    if (response.status === 403) {
      const message = await readApiMessage(response)
      setStatusMessage(message || 'Utente autenticato ma senza profili disponibili su Produzione.')
      setProfiles([])
      setSelectedProfile('')
      setOuScopes([])
      return false
    }

    if (!response.ok) {
      const message = await readApiMessage(response)
      setStatusMessage(message || `Errore recupero profili (${response.status}).`)
      setProfiles([])
      setSelectedProfile('')
      setOuScopes([])
      return false
    }

    const payload = (await response.json()) as AvailableProfilesResponse
    setProfiles(payload.profiles)
    setOuScopes(payload.ouScopes)
    setSelectedProfile((current) => {
      if (current && payload.profiles.includes(current)) {
        return current
      }

      return payload.profiles[0] ?? ''
    })

    return true
  }

  const ensureSession = async (
    jwt: string,
    reasonIfInvalid: string,
    impersonationUsername = activeImpersonation,
  ) => {
    if (!jwt.trim()) {
      clearSession()
      redirectToCentralAuth('missing_token')
      return false
    }

    setSessionLoading(true)
    try {
      const userProbe = await loadCurrentUser(jwt, impersonationUsername)
      if (userProbe.state === 'unauthorized') {
        clearSession()
        redirectToCentralAuth(reasonIfInvalid)
        return false
      }

      if (userProbe.state === 'forbidden') {
        setUser(null)
        setProfiles([])
        setSelectedProfile('')
        setOuScopes([])
        setStatusMessage(userProbe.message)
        return false
      }

      if (userProbe.state === 'error') {
        setStatusMessage(userProbe.message)
        return false
      }

      const profilesOk = await loadProfiles(jwt, impersonationUsername)
      if (!profilesOk) {
        return false
      }

      if (userProbe.user.isImpersonating) {
        setStatusMessage(`Sessione valida. Impersonificazione attiva su "${userProbe.user.username}".`)
      } else {
        setStatusMessage('Sessione valida tramite autenticazione centralizzata.')
      }

      return true
    } finally {
      setSessionLoading(false)
    }
  }

  const applyImpersonation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requested = impersonationInput.trim()
    if (!requested) {
      setStatusMessage('Inserisci lo username da impersonificare.')
      return
    }

    if (!token.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setStatusMessage(`Verifica impersonificazione utente "${requested}"...`)
    const ok = await ensureSession(token, 'stale_token', requested)
    if (!ok) {
      return
    }

    setImpersonationModalOpen(false)
    setOpenMenu(null)
  }

  const stopImpersonation = async () => {
    if (!token.trim()) {
      return
    }

    setStatusMessage('Rimozione impersonificazione in corso...')
    const ok = await ensureSession(token, 'stale_token', '')
    if (!ok) {
      return
    }

    setImpersonationInput('')
    setImpersonationModalOpen(false)
    setOpenMenu(null)
    setStatusMessage('Impersonificazione terminata. Contesto personale ripristinato.')
  }

  const handleOpenInfo = () => {
    setOpenMenu(null)
    setInfoModalOpen(true)
  }

  const handleOpenImpersonation = () => {
    if (!canImpersonate) {
      return
    }

    setImpersonationInput(activeImpersonation || '')
    setOpenMenu(null)
    setImpersonationModalOpen(true)
  }

  const handleLogout = () => {
    setOpenMenu(null)
    setInfoModalOpen(false)
    setImpersonationModalOpen(false)
    clearSession()
    sessionStorage.removeItem(redirectGuardKey)
    setStatusMessage('Logout locale eseguito.')
    redirectToCentralAuth('logout')
  }

  const toggleMenu = (menu: MenuKey) => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  useEffect(() => {
    function handleGlobalClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        setOpenMenu(null)
        return
      }

      if (!event.target.closest('.menu-dropdown')) {
        setOpenMenu(null)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    document.addEventListener('click', handleGlobalClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('click', handleGlobalClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    void loadHealth()

    const savedImpersonation = (sessionStorage.getItem(impersonationStorageKey) ?? '').trim()
    if (savedImpersonation) {
      setImpersonationInput(savedImpersonation)
    }

    const params = new URLSearchParams(window.location.search)
    const tokenFromAuth = params.get('token')?.trim() ?? ''

    if (tokenFromAuth) {
      sessionStorage.removeItem(redirectGuardKey)
      saveToken(tokenFromAuth)
      params.delete('token')
      params.delete('expiresAtUtc')
      const queryString = params.toString()
      const cleanUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
      setStatusMessage('Token ricevuto da Auth. Verifica sessione...')
      void ensureSession(tokenFromAuth, 'invalid_token', savedImpersonation)
      return
    }

    const savedToken = (localStorage.getItem(tokenStorageKey) ?? '').trim()
    if (savedToken) {
      sessionStorage.removeItem(redirectGuardKey)
      saveToken(savedToken)
      setStatusMessage('Sessione locale trovata. Verifica in corso...')
      void ensureSession(savedToken, 'stale_token', savedImpersonation)
      return
    }

    redirectToCentralAuth('missing_token')
  }, [])

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-area">
          <div className="brand">Produzione</div>
          <p className="brand-subtitle">SSO centralizzato con Auth</p>
        </div>

        <div className="top-actions">
          {profiles.length > 0 && (
            <label className="context-switcher" htmlFor="context-switcher-profile">
              <span>Profilo</span>
              <select
                id="context-switcher-profile"
                value={currentProfile}
                onChange={(event) => {
                  setSelectedProfile(event.target.value)
                }}
              >
                {profiles.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={`status-badge ${apiHealth === 'OK' ? 'ok' : 'ko'}`}>
            API: {apiHealth}
          </div>

          {user && (
            <div className={`menu-dropdown menu-dropdown-right ${openMenu === 'user' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger user-menu-trigger"
                onClick={() => toggleMenu('user')}
                aria-expanded={openMenu === 'user'}
              >
                <strong>{user.authenticatedUsername || user.username}</strong>
                <span>{isImpersonating ? 'impersona' : 'login'}</span>
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={handleOpenInfo}>
                  Info
                </button>
                {canImpersonate && (
                  <button type="button" className="menu-action" onClick={handleOpenImpersonation}>
                    Impersonifica
                  </button>
                )}
                {isImpersonating && (
                  <button
                    type="button"
                    className="menu-action"
                    onClick={() => void stopImpersonation()}
                    disabled={sessionLoading}
                  >
                    {sessionLoading ? 'Attendi...' : 'Termina impersonificazione'}
                  </button>
                )}
                <button type="button" className="menu-action" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="content content-empty">
        <span className="sr-only" aria-live="polite">{statusMessage}</span>
      </main>

      {infoModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="info-title">
            <header className="modal-header">
              <h2 id="info-title">Info Utente</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setInfoModalOpen(false)}
              >
                Chiudi
              </button>
            </header>
            <div className="modal-details">
              <p><strong>Utente autenticato:</strong> {user?.authenticatedUsername || user?.username || 'n/d'}</p>
              <p><strong>Utente effettivo:</strong> {user?.username || 'n/d'}</p>
              <p><strong>Impersonificazione:</strong> {isImpersonating ? 'Attiva' : 'Non attiva'}</p>
              <p><strong>Ruoli autenticati:</strong> {authenticatedRoles.length > 0 ? authenticatedRoles.join(', ') : 'n/d'}</p>
              <p><strong>Profili effettivi:</strong> {profiles.length > 0 ? profiles.join(', ') : 'n/d'}</p>
              <p><strong>OU effettive:</strong> {ouScopes.length > 0 ? ouScopes.join(', ') : 'n/d'}</p>
            </div>
          </section>
        </div>
      )}

      {impersonationModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="impersona-title">
            <header className="modal-header">
              <h2 id="impersona-title">Impersonifica Utente</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setImpersonationModalOpen(false)}
                disabled={sessionLoading}
              >
                Chiudi
              </button>
            </header>
            <form className="form" onSubmit={(event) => void applyImpersonation(event)}>
              <label htmlFor="impersona-user">Username target</label>
              <input
                id="impersona-user"
                value={impersonationInput}
                onChange={(event) => setImpersonationInput(event.target.value)}
                placeholder="es: acastiglione"
                autoFocus
              />
              {isImpersonating && (
                <p className="menu-note">
                  Attiva: {user?.impersonatorUsername || user?.authenticatedUsername || '-'}
                  {' -> '}
                  {user?.username}
                </p>
              )}
              <div className="inline-actions">
                <button type="submit" disabled={sessionLoading}>
                  {sessionLoading ? 'Attendi...' : 'Applica'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={sessionLoading || !isImpersonating}
                  onClick={() => void stopImpersonation()}
                >
                  Termina
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App

