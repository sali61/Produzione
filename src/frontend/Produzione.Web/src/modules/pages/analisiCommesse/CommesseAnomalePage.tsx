// @ts-nocheck
import type { FormEvent } from 'react'
import type { CommessaAnomalaRow } from '../../types/appTypes'

type CommesseAnomalePageProps = {
  currentProfile: string
  analisiRccLoading: boolean
  analisiPageCountLabel: string
  commesseAnomaleFiltroAnomalia: string
  commesseAnomaleAnomaliaOptions: string[]
  commesseAnomaleFiltroRcc: string
  commesseAnomaleRccOptions: string[]
  commesseAnomaleRowsRawCount: number
  commesseAnomaleRows: CommessaAnomalaRow[]
  commesseAnomaleDataLoaded: boolean
  statusMessageVisible: string
  handleAnalisiSubmit: (event: FormEvent<HTMLFormElement>) => void
  setCommesseAnomaleFiltroAnomalia: (value: string) => void
  setCommesseAnomaleFiltroRcc: (value: string) => void
  resetAnalisiFilters: () => void
  exportAnalisiExcel: () => void
  openCommessaDetail: (commessa: string) => void
  formatNumber: (value: number) => string
}

export function CommesseAnomalePage(props: CommesseAnomalePageProps) {
  const {
    currentProfile,
    analisiRccLoading,
    analisiPageCountLabel,
    commesseAnomaleFiltroAnomalia,
    commesseAnomaleAnomaliaOptions,
    commesseAnomaleFiltroRcc,
    commesseAnomaleRccOptions,
    commesseAnomaleRowsRawCount,
    commesseAnomaleRows,
    commesseAnomaleDataLoaded,
    statusMessageVisible,
    handleAnalisiSubmit,
    setCommesseAnomaleFiltroAnomalia,
    setCommesseAnomaleFiltroRcc,
    resetAnalisiFilters,
    exportAnalisiExcel,
    openCommessaDetail,
    formatNumber,
  } = props

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Commesse - Commesse Anomale</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      <section className="panel sintesi-filter-panel">
        <form
          className={`analisi-rcc-toolbar ${analisiRccLoading ? 'is-filter-loading' : ''}`}
          onSubmit={handleAnalisiSubmit}
        >
          <label className="analisi-rcc-year-field" htmlFor="commesse-anomale-anomalia">
            <span>Anomalia</span>
            <select
              id="commesse-anomale-anomalia"
              value={commesseAnomaleFiltroAnomalia}
              onChange={(event) => setCommesseAnomaleFiltroAnomalia(event.target.value)}
              disabled={analisiRccLoading || commesseAnomaleRowsRawCount === 0}
            >
              <option value="">Tutte</option>
              {commesseAnomaleAnomaliaOptions.map((option) => (
                <option key={`commesse-anomale-anomalia-${option}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="analisi-rcc-year-field" htmlFor="commesse-anomale-rcc">
            <span>RCC</span>
            <select
              id="commesse-anomale-rcc"
              value={commesseAnomaleFiltroRcc}
              onChange={(event) => setCommesseAnomaleFiltroRcc(event.target.value)}
              disabled={analisiRccLoading || commesseAnomaleRowsRawCount === 0}
            >
              <option value="">Tutti</option>
              {commesseAnomaleRccOptions.map((option) => (
                <option key={`commesse-anomale-rcc-${option}`} value={option}>
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
              disabled={analisiRccLoading || commesseAnomaleRows.length === 0}
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
            {commesseAnomaleDataLoaded
              ? `Commesse anomale caricate: ${commesseAnomaleRows.length} righe${commesseAnomaleRows.length !== commesseAnomaleRowsRawCount ? ` (su ${commesseAnomaleRowsRawCount} totali)` : ''}.`
              : statusMessageVisible}
          </p>
        </div>
      </section>

      <section className="panel analisi-rcc-grid-card">
        {commesseAnomaleRows.length === 0 && !analisiRccLoading && (
          <p className="empty-state">Nessuna commessa anomala disponibile per i criteri correnti.</p>
        )}

        {commesseAnomaleRows.length > 0 && (
          <div className="bonifici-table-wrap bonifici-table-wrap-main">
            <table className="bonifici-table">
              <thead>
                <tr>
                  <th>Anomalia</th>
                  <th>Dettaglio anomalia</th>
                  <th>Commessa</th>
                  <th>Descrizione</th>
                  <th>Tipologia</th>
                  <th>Stato</th>
                  <th>Macrotipologia</th>
                  <th>Controparte</th>
                  <th>Business Unit</th>
                  <th>RCC</th>
                  <th>PM</th>
                  <th className="num">Ore Lavorate</th>
                  <th className="num">Costo Personale</th>
                  <th className="num">Ricavi</th>
                  <th className="num">Costi</th>
                  <th className="num">Ricavi Futuri</th>
                  <th className="num">Costi Futuri</th>
                </tr>
              </thead>
              <tbody>
                {commesseAnomaleRows.map((row) => (
                  <tr key={`${row.idCommessa}-${row.tipoAnomalia}-${row.dettaglioAnomalia}`}>
                    <td>{row.tipoAnomalia}</td>
                    <td>{row.dettaglioAnomalia}</td>
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
                    <td>{row.descrizioneCommessa}</td>
                    <td>{row.tipologiaCommessa}</td>
                    <td>{row.stato}</td>
                    <td>{row.macroTipologia}</td>
                    <td>{row.controparte}</td>
                    <td>{row.businessUnit}</td>
                    <td>{row.rcc}</td>
                    <td>{row.pm}</td>
                    <td className="num">{formatNumber(row.oreLavorate)}</td>
                    <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                    <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                    <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                    <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                    <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
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
