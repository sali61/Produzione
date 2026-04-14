import type { Dispatch, SetStateAction } from 'react'
import type { AppInfoVoice } from '../../types/appTypes'

type AppInfoModalGroup = {
  menu: string
  voci: AppInfoVoice[]
}

type AppInfoModalProps = {
  open: boolean
  currentProfile: string
  appVersion: string
  canEditAppInfo: boolean
  appInfoStatus: string
  appInfoLoading: boolean
  appInfoByMenu: AppInfoModalGroup[]
  appInfoDrafts: Record<string, string>
  appInfoSavingKey: string
  appInfoVoiceKey: (menu: string, voce: string) => string
  setAppInfoDrafts: Dispatch<SetStateAction<Record<string, string>>>
  saveAppInfoDescription: (menu: string, voce: string) => Promise<boolean>
  onClose: () => void
}

export function AppInfoModal(props: AppInfoModalProps) {
  const {
    open,
    currentProfile,
    appVersion,
    canEditAppInfo,
    appInfoStatus,
    appInfoLoading,
    appInfoByMenu,
    appInfoDrafts,
    appInfoSavingKey,
    appInfoVoiceKey,
    setAppInfoDrafts,
    saveAppInfoDescription,
    onClose,
  } = props

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card app-info-modal-card" role="dialog" aria-modal="true" aria-labelledby="app-info-title">
        <header className="modal-header">
          <h2 id="app-info-title">Info Applicazione - Produzione</h2>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
          >
            Chiudi
          </button>
        </header>
        <div className="modal-details app-info-details">
          <p className="app-info-intro">
            Riepilogo menu e funzionalita principali attive in questa versione dell applicazione.
          </p>
          <p className="app-info-intro">
            Profilo attivo: {currentProfile || 'n/d'}.
            {canEditAppInfo ? ' Modalita modifica descrizioni attiva.' : ' Modalita sola lettura.'}
          </p>
          <p className="app-info-intro">
            Versione applicazione: {appVersion}.
          </p>
          {appInfoStatus && (
            <p className="app-info-intro">{appInfoStatus}</p>
          )}
          {appInfoLoading && (
            <p className="app-info-intro">Caricamento in corso...</p>
          )}
          {appInfoByMenu.map((group) => (
            <section key={`app-info-${group.menu}`} className="app-info-menu-block">
              <h3>{group.menu}</h3>
              <ul className="app-info-voice-list">
                {group.voci.map((item) => {
                  const itemKey = appInfoVoiceKey(item.menu, item.voce)
                  const draftValue = appInfoDrafts[itemKey] ?? item.sintesi
                  const isSaving = appInfoSavingKey === itemKey
                  const canSave = canEditAppInfo && !appInfoLoading && !isSaving
                  return (
                  <li key={`app-info-${group.menu}-${item.voce}`} className="app-info-voice-item">
                    <p className="app-info-voice-title">{item.voce}</p>
                    {canEditAppInfo ? (
                      <>
                        <textarea
                          className="app-info-voice-input"
                          value={draftValue}
                          onChange={(event) => setAppInfoDrafts((current) => ({
                            ...current,
                            [itemKey]: event.target.value,
                          }))}
                          rows={3}
                        />
                        <div className="app-info-voice-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            disabled={!canSave}
                            onClick={() => void saveAppInfoDescription(item.menu, item.voce)}
                          >
                            {isSaving ? 'Salvo...' : 'Salva'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="app-info-voice-summary">{item.sintesi}</p>
                    )}
                  </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
