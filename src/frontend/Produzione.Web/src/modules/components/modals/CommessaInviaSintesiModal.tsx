import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CommessaSintesiMailSendRequest,
  CommesseDettaglioSintesiMailPreviewResponse,
} from '../../types/appTypes'

const defaultRoleOrder = ['RCC', 'RP', 'PM', 'ROU', 'RC', 'CDG']

function buildDefaultBodyHtml(commessa: string): string {
  const commessaText = (commessa ?? '').trim()
  const safeCommessa = commessaText.length > 0 ? commessaText : 'la commessa selezionata'
  return [
    '<p>Buongiorno,</p>',
    `<p>in allegato la sintesi aggiornata della commessa <strong>${safeCommessa}</strong>.</p>`,
    '<p>Puoi rispondere a questa mail per eventuali approfondimenti.</p>',
    '<p>Grazie.</p>',
  ].join('')
}

type CommessaInviaSintesiModalProps = {
  open: boolean
  commessa: string
  loading: boolean
  sending: boolean
  preview: CommesseDettaglioSintesiMailPreviewResponse | null
  statusMessage: string
  errorMessage: string
  onClose: () => void
  onReloadPreview: () => void
  onSend: (request: CommessaSintesiMailSendRequest) => void
}

export function CommessaInviaSintesiModal(props: CommessaInviaSintesiModalProps) {
  const {
    open,
    commessa,
    loading,
    sending,
    preview,
    statusMessage,
    errorMessage,
    onClose,
    onReloadPreview,
    onSend,
  } = props

  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [includeAssociati, setIncludeAssociati] = useState(false)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    if (!preview && !loading) {
      onReloadPreview()
    }
  }, [loading, onReloadPreview, open, preview])

  useEffect(() => {
    if (!open) {
      return
    }

    // Pre-compila subito soggetto/corpo con template base, poi eventualmente
    // viene sovrascritto dalla preview backend.
    const normalizedCommessa = (commessa ?? '').trim()
    setSubject(`[Produzione] Sintesi commessa ${normalizedCommessa}`)
    setBodyHtml(buildDefaultBodyHtml(normalizedCommessa))
  }, [commessa, open])

  useEffect(() => {
    if (!open || !preview) {
      return
    }

    const initialRoles = preview.roleOptions
      .filter((item) => item.available && ['RCC', 'PM', 'ROU'].includes(item.roleCode.toUpperCase()))
      .map((item) => item.roleCode)
    setSelectedRoles(initialRoles)
    setIncludeAssociati(false)
    const normalizedCommessa = (preview.commessa || commessa || '').trim()
    setSubject(preview.suggestedSubject || `[Produzione] Sintesi commessa ${normalizedCommessa}`)
    setBodyHtml(preview.suggestedBodyHtml || buildDefaultBodyHtml(normalizedCommessa))
  }, [open, preview])

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml || ''
    }
  }, [bodyHtml])

  const associatedCount = useMemo(
    () => (preview?.recipients ?? []).filter((item) => item.associatoCommessa).length,
    [preview],
  )

  const selectedRecipients = useMemo(() => {
    const recipients = preview?.recipients ?? []
    if (recipients.length === 0) {
      return []
    }

    const selectedRoleSet = new Set(selectedRoles.map((item) => item.toUpperCase()))
    return recipients.filter((recipient) => {
      const hasRole = recipient.ruoli.some((role) => selectedRoleSet.has((role ?? '').toUpperCase()))
      return hasRole || (includeAssociati && recipient.associatoCommessa)
    })
  }, [includeAssociati, preview, selectedRoles])

  const selectedEmails = useMemo(() => {
    return [...new Set(
      selectedRecipients
        .map((recipient) => (recipient.email ?? '').trim().toLowerCase())
        .filter((email) => email.length > 0),
    )].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [selectedRecipients])

  if (!open) {
    return null
  }

  const canSend =
    selectedEmails.length > 0 &&
    (selectedRoles.length > 0 || includeAssociati) &&
    subject.trim().length > 0 &&
    !sending &&
    !loading &&
    !!preview

  const toggleRole = (roleCode: string) => {
    setSelectedRoles((current) => {
      if (current.some((item) => item.localeCompare(roleCode, 'it', { sensitivity: 'base' }) === 0)) {
        return current.filter((item) => item.localeCompare(roleCode, 'it', { sensitivity: 'base' }) !== 0)
      }

      return [...current, roleCode]
    })
  }

  const applyEditorCommand = (command: string) => {
    if (!editorRef.current) {
      return
    }

    editorRef.current.focus()
    // Deprecated API ma ancora efficace per un editor HTML leggero senza librerie esterne.
    document.execCommand(command, false)
    setBodyHtml(editorRef.current.innerHTML || '')
  }

  const insertLink = () => {
    const url = window.prompt('Inserisci URL')
    if (!url || !editorRef.current) {
      return
    }

    editorRef.current.focus()
    document.execCommand('createLink', false, url.trim())
    setBodyHtml(editorRef.current.innerHTML || '')
  }

  const handleSend = () => {
    if (!preview) {
      return
    }

    const request: CommessaSintesiMailSendRequest = {
      commessa: preview.commessa || commessa,
      ruoli: selectedRoles,
      includeAssociatiCommessa: includeAssociati,
      oggetto: subject.trim(),
      corpoHtml: editorRef.current?.innerHTML ?? bodyHtml,
      corpoTesto: (editorRef.current?.innerText ?? '').trim(),
    }

    onSend(request)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card sintesi-mail-modal-card" role="dialog" aria-modal="true" aria-labelledby="sintesi-mail-title">
        <header className="modal-header">
          <h2 id="sintesi-mail-title">Invia sintesi commessa</h2>
          <button type="button" className="ghost-button" onClick={onClose}>
            Chiudi
          </button>
        </header>

        <div className="modal-details sintesi-mail-modal-content">
          <p className="app-info-intro">
            Commessa: <strong>{preview?.commessa || commessa || '-'}</strong>.
          </p>

          <section className="sintesi-mail-role-grid">
            {(preview?.roleOptions ?? [])
              .slice()
              .sort((left, right) => {
                const leftIndex = defaultRoleOrder.indexOf((left.roleCode ?? '').toUpperCase())
                const rightIndex = defaultRoleOrder.indexOf((right.roleCode ?? '').toUpperCase())
                if (leftIndex >= 0 && rightIndex >= 0) {
                  return leftIndex - rightIndex
                }
                if (leftIndex >= 0) {
                  return -1
                }
                if (rightIndex >= 0) {
                  return 1
                }
                return (left.label ?? '').localeCompare(right.label ?? '', 'it', { sensitivity: 'base' })
              })
              .map((roleOption) => (
                <label key={`role-option-${roleOption.roleCode}`} className={`sintesi-mail-role-option ${!roleOption.available ? 'is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.some((item) => item.localeCompare(roleOption.roleCode, 'it', { sensitivity: 'base' }) === 0)}
                    onChange={() => toggleRole(roleOption.roleCode)}
                    disabled={loading || sending}
                  />
                  <span>{roleOption.label}</span>
                  <small>{roleOption.available ? `${roleOption.emails.length} email` : 'nessuna email'}</small>
                </label>
              ))}

            <label className={`sintesi-mail-role-option ${associatedCount <= 0 ? 'is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={includeAssociati}
                onChange={() => setIncludeAssociati((current) => !current)}
                disabled={associatedCount <= 0 || loading || sending}
              />
              <span>Utenti associati alla commessa</span>
              <small>{associatedCount > 0 ? `${associatedCount} risorse` : 'nessuna risorsa'}</small>
            </label>
          </section>

          <div className="sintesi-mail-selected-emails">
            <p className="app-info-intro"><strong>Email collegate ai ruoli selezionati</strong></p>
            {selectedEmails.length === 0 && (
              <p className="empty-state">Nessuna email selezionata.</p>
            )}
            {selectedEmails.length > 0 && (
              <ul className="sintesi-mail-email-list">
                {selectedEmails.map((email) => (
                  <li key={`selected-email-${email}`}>{email}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="sintesi-mail-field">
            <label htmlFor="sintesi-mail-subject">Oggetto</label>
            <input
              id="sintesi-mail-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={loading || sending}
              placeholder="Oggetto mail"
            />
          </div>

          <div className="sintesi-mail-field">
            <label>Corpo mail</label>
            <div className="sintesi-mail-toolbar" role="toolbar" aria-label="Formattazione testo">
              <button type="button" className="ghost-button" onClick={() => applyEditorCommand('bold')} disabled={loading || sending}>B</button>
              <button type="button" className="ghost-button" onClick={() => applyEditorCommand('italic')} disabled={loading || sending}>I</button>
              <button type="button" className="ghost-button" onClick={() => applyEditorCommand('underline')} disabled={loading || sending}>U</button>
              <button type="button" className="ghost-button" onClick={() => applyEditorCommand('insertUnorderedList')} disabled={loading || sending}>Lista</button>
              <button type="button" className="ghost-button" onClick={() => applyEditorCommand('insertOrderedList')} disabled={loading || sending}>Numerata</button>
              <button type="button" className="ghost-button" onClick={insertLink} disabled={loading || sending}>Link</button>
            </div>
            <div
              ref={editorRef}
              className="sintesi-mail-editor"
              contentEditable={!loading && !sending}
              suppressContentEditableWarning
              onInput={(event) => setBodyHtml((event.currentTarget as HTMLDivElement).innerHTML || '')}
            />
          </div>

          {errorMessage && (
            <p className="status-message error">{errorMessage}</p>
          )}
          {statusMessage && (
            <p className="status-message">{statusMessage}</p>
          )}

          <div className="sintesi-mail-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={sending}>
              Annulla
            </button>
            <button type="button" className="primary-button" onClick={handleSend} disabled={!canSend}>
              {sending ? 'Invio...' : 'Invia'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
