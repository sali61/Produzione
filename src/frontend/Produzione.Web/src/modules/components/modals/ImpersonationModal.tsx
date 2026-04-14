import type { FormEvent } from 'react'
import type { CurrentUser } from '../../types/appTypes'

type ImpersonationModalProps = {
  open: boolean
  sessionLoading: boolean
  impersonationInput: string
  isImpersonating: boolean
  user: CurrentUser | null
  setImpersonationInput: (value: string) => void
  applyImpersonation: (event: FormEvent<HTMLFormElement>) => Promise<void>
  stopImpersonation: () => Promise<void>
  onClose: () => void
}

export function ImpersonationModal(props: ImpersonationModalProps) {
  const {
    open,
    sessionLoading,
    impersonationInput,
    isImpersonating,
    user,
    setImpersonationInput,
    applyImpersonation,
    stopImpersonation,
    onClose,
  } = props

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="impersona-title">
        <header className="modal-header">
          <h2 id="impersona-title">Impersonifica Utente</h2>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
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
  )
}
