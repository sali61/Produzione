// @ts-nocheck
import type { FormEvent } from 'react'
import type { CommessaSegnalazioneAnalisiRow } from '../../types/appTypes'

type CommesseSegnalazioniPageProps = {
  currentProfile: string
  analisiRccLoading: boolean
  analisiPageCountLabel: string
  commesseSegnalazioniDataLoaded: boolean
  commesseSegnalazioniRowsRawCount: number
  commesseSegnalazioniRows: CommessaSegnalazioneAnalisiRow[]
  commesseSegnalazioniFiltroStato: string
  commesseSegnalazioniFiltroAssegnatario: string
  commesseSegnalazioniStatoOptions: Array<{ value: string; label: string }>
  commesseSegnalazioniAssegnatarioOptions: string[]
  statusMessageVisible: string
  handleAnalisiSubmit: (event: FormEvent<HTMLFormElement>) => void
  setCommesseSegnalazioniFiltroStato: (value: string) => void
  setCommesseSegnalazioniFiltroAssegnatario: (value: string) => void
  resetAnalisiFilters: () => void
  exportAnalisiExcel: () => void
  openCommessaDetail: (commessa: string) => void
  formatDate: (value?: string | null) => string
}

const statoLabel = (value: number) => {
  switch (value) {
    case 1:
      return 'Aperta'
    case 2:
      return 'In lavorazione'
    case 3:
      return 'In attesa'
    case 4:
      return 'Chiusa'
    default:
      return value > 0 ? value.toString() : '-'
  }
}

const prioritaLabel = (value: number) => {
  switch (value) {
    case 1:
      return 'Alta'
    case 2:
      return 'Media'
    case 3:
      return 'Bassa'
    default:
      return value > 0 ? value.toString() : '-'
  }
}

export function CommesseSegnalazioniPage(props: CommesseSegnalazioniPageProps) {
  const {
    currentProfile,
    analisiRccLoading,
    analisiPageCountLabel,
    commesseSegnalazioniDataLoaded,
    commesseSegnalazioniRowsRawCount,
    commesseSegnalazioniRows,
    commesseSegnalazioniFiltroStato,
    commesseSegnalazioniFiltroAssegnatario,
    commesseSegnalazioniStatoOptions,
    commesseSegnalazioniAssegnatarioOptions,
    statusMessageVisible,
    handleAnalisiSubmit,
    setCommesseSegnalazioniFiltroStato,
    setCommesseSegnalazioniFiltroAssegnatario,
    resetAnalisiFilters,
    exportAnalisiExcel,
    openCommessaDetail,
    formatDate,
  } = props

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Commesse - Segnalazioni</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      <section className="panel sintesi-filter-panel">
        <form
          className={`analisi-rcc-toolbar ${analisiRccLoading ? 'is-filter-loading' : ''}`}
          onSubmit={handleAnalisiSubmit}
        >
          <label className="analisi-rcc-year-field" htmlFor="commesse-segnalazioni-stato">
            <span>Stato</span>
            <select
              id="commesse-segnalazioni-stato"
              value={commesseSegnalazioniFiltroStato}
              onChange={(event) => setCommesseSegnalazioniFiltroStato(event.target.value)}
              disabled={analisiRccLoading || commesseSegnalazioniRowsRawCount === 0}
            >
              <option value="">Tutti</option>
              {commesseSegnalazioniStatoOptions.map((option) => (
                <option key={`commesse-segnalazioni-stato-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="analisi-rcc-year-field" htmlFor="commesse-segnalazioni-assegnatario">
            <span>Assegnatario</span>
            <select
              id="commesse-segnalazioni-assegnatario"
              value={commesseSegnalazioniFiltroAssegnatario}
              onChange={(event) => setCommesseSegnalazioniFiltroAssegnatario(event.target.value)}
              disabled={analisiRccLoading || commesseSegnalazioniRowsRawCount === 0}
            >
              <option value="">Tutti</option>
              {commesseSegnalazioniAssegnatarioOptions.map((option) => (
                <option key={`commesse-segnalazioni-assegnatario-${option}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-actions">
            <button type="submit" disabled={analisiRccLoading}>
              {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={resetAnalisiFilters}
              disabled={analisiRccLoading}
            >
              Reset
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={exportAnalisiExcel}
              disabled={analisiRccLoading || commesseSegnalazioniRows.length === 0}
            >
              Export Excel
            </button>
            <span className="status-badge neutral sintesi-inline-count-badge">
              {analisiPageCountLabel}
            </span>
          </div>
        </form>

        <div className="sintesi-toolbar-row">
          <p className="sintesi-toolbar-message">
            {commesseSegnalazioniDataLoaded
              ? `Segnalazioni caricate: ${commesseSegnalazioniRows.length} righe${commesseSegnalazioniRows.length !== commesseSegnalazioniRowsRawCount ? ` (su ${commesseSegnalazioniRowsRawCount} totali)` : ''}.`
              : statusMessageVisible}
          </p>
        </div>
      </section>

      <section className="panel analisi-rcc-grid-card">
        {commesseSegnalazioniRows.length === 0 && !analisiRccLoading && (
          <p className="empty-state">Nessuna segnalazione disponibile per i criteri correnti.</p>
        )}

        {commesseSegnalazioniRows.length > 0 && (
          <div className="bonifici-table-wrap bonifici-table-wrap-main">
            <table className="bonifici-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Titolo</th>
                  <th>Testo</th>
                  <th>Priorita</th>
                  <th>Stato</th>
                  <th>Impatta</th>
                  <th>Autore</th>
                  <th>Data modifica</th>
                  <th>Assegnata a</th>
                  <th>Commessa</th>
                </tr>
              </thead>
              <tbody>
                {commesseSegnalazioniRows.map((row) => (
                  <tr key={`commessa-segnalazione-analisi-${row.id}`}>
                    <td>{row.tipoDescrizione || row.tipoCodice}</td>
                    <td>{row.titolo}</td>
                    <td>{row.testo}</td>
                    <td>{prioritaLabel(row.priorita)}</td>
                    <td>{statoLabel(row.stato)}</td>
                    <td>{row.impattaCliente ? 'Si' : 'No'}</td>
                    <td>{row.nomeRisorsaInserimento}</td>
                    <td>{formatDate(row.dataUltimaModifica ?? row.dataInserimento)}</td>
                    <td>{row.nomeRisorsaDestinataria || 'Non assegnata'}</td>
                    <td>
                      <button
                        type="button"
                        className="inline-link-button"
                        onClick={() => openCommessaDetail(row.commessa)}
                        title={`Apri dettaglio commessa ${row.commessa}`}
                      >
                        {row.commessa}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
