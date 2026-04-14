import type { CurrentUser } from '../../types/appTypes'

type UserInfoModalProps = {
  open: boolean
  user: CurrentUser | null
  isImpersonating: boolean
  authenticatedRoles: string[]
  profiles: string[]
  ouScopes: string[]
  onClose: () => void
}

export function UserInfoModal(props: UserInfoModalProps) {
  const {
    open,
    user,
    isImpersonating,
    authenticatedRoles,
    profiles,
    ouScopes,
    onClose,
  } = props

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <header className="modal-header">
          <h2 id="info-title">Info Utente</h2>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
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
  )
}
