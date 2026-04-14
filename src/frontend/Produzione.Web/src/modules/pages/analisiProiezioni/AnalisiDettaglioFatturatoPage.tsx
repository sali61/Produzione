// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiDettaglioFatturatoPageProps = any

export function AnalisiDettaglioFatturatoPage(props: AnalisiDettaglioFatturatoPageProps) {
  const {
    analisiDettaglioFatturatoAnni,
    analisiDettaglioFatturatoAnnoOptions,
    analisiDettaglioFatturatoBusinessUnit,
    analisiDettaglioFatturatoBusinessUnitOptions,
    analisiDettaglioFatturatoCommessa,
    analisiDettaglioFatturatoCommessaSearch,
    analisiDettaglioFatturatoCommesseOptions,
    analisiDettaglioFatturatoControparte,
    analisiDettaglioFatturatoControparteOptions,
    analisiDettaglioFatturatoProvenienza,
    analisiDettaglioFatturatoProvenienzaOptions,
    analisiDettaglioFatturatoRcc,
    analisiDettaglioFatturatoRccOptions,
    analisiDettaglioFatturatoRows,
    analisiDettaglioFatturatoSoloScadute,
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessAnalisiDettaglioFatturatoPage,
    canExportAnalisiPage,
    currentProfile,
    exportAnalisiExcel,
    formatDate,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiDettaglioFatturatoAnni,
    setAnalisiDettaglioFatturatoBusinessUnit,
    setAnalisiDettaglioFatturatoCommessa,
    setAnalisiDettaglioFatturatoCommessaSearch,
    setAnalisiDettaglioFatturatoControparte,
    setAnalisiDettaglioFatturatoProvenienza,
    setAnalisiDettaglioFatturatoRcc,
    setAnalisiDettaglioFatturatoSoloScadute,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Dettaglio Fatturato</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiDettaglioFatturatoPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiDettaglioFatturatoPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-anni">
                      <span>Anni</span>
                      <select
                        id="analisi-dettaglio-fatturato-anni"
                        multiple
                        size={4}
                        value={analisiDettaglioFatturatoAnni}
                        onChange={(event) => setAnalisiDettaglioFatturatoAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiDettaglioFatturatoAnnoOptions.map((year) => (
                          <option key={`analisi-dettaglio-fatturato-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-commessa-search">
                      <span>Ricerca Commessa</span>
                      <input
                        id="analisi-dettaglio-fatturato-commessa-search"
                        type="search"
                        value={analisiDettaglioFatturatoCommessaSearch}
                        onChange={(event) => setAnalisiDettaglioFatturatoCommessaSearch(event.target.value)}
                        placeholder="Cerca..."
                        autoComplete="off"
                      />
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-commessa">
                      <span>Commessa</span>
                      <select
                        id="analisi-dettaglio-fatturato-commessa"
                        value={analisiDettaglioFatturatoCommessa}
                        onChange={(event) => setAnalisiDettaglioFatturatoCommessa(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {analisiDettaglioFatturatoCommesseOptions.map((value) => (
                          <option key={`analisi-dettaglio-fatturato-commessa-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-provenienza">
                      <span>Provenienza</span>
                      <select
                        id="analisi-dettaglio-fatturato-provenienza"
                        value={analisiDettaglioFatturatoProvenienza}
                        onChange={(event) => setAnalisiDettaglioFatturatoProvenienza(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {analisiDettaglioFatturatoProvenienzaOptions.map((value) => (
                          <option key={`analisi-dettaglio-fatturato-provenienza-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-controparte">
                      <span>Controparte</span>
                      <select
                        id="analisi-dettaglio-fatturato-controparte"
                        value={analisiDettaglioFatturatoControparte}
                        onChange={(event) => setAnalisiDettaglioFatturatoControparte(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {analisiDettaglioFatturatoControparteOptions.map((value) => (
                          <option key={`analisi-dettaglio-fatturato-controparte-${value}`} value={value}>
                            {value}
                          </option>
                          ))}
                        </select>
                      </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-business-unit">
                      <span>BU</span>
                      <select
                        id="analisi-dettaglio-fatturato-business-unit"
                        value={analisiDettaglioFatturatoBusinessUnit}
                        onChange={(event) => setAnalisiDettaglioFatturatoBusinessUnit(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {analisiDettaglioFatturatoBusinessUnitOptions.map((value) => (
                          <option key={`analisi-dettaglio-fatturato-business-unit-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-dettaglio-fatturato-rcc">
                      <span>RCC</span>
                      <select
                        id="analisi-dettaglio-fatturato-rcc"
                        value={analisiDettaglioFatturatoRcc}
                        onChange={(event) => setAnalisiDettaglioFatturatoRcc(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {analisiDettaglioFatturatoRccOptions.map((value) => (
                          <option key={`analisi-dettaglio-fatturato-rcc-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-label checkbox-label-inline analisi-aggrega-inline" htmlFor="analisi-dettaglio-fatturato-solo-scadute">
                      <input
                        id="analisi-dettaglio-fatturato-solo-scadute"
                        type="checkbox"
                        checked={analisiDettaglioFatturatoSoloScadute}
                        onChange={(event) => setAnalisiDettaglioFatturatoSoloScadute(event.target.checked)}
                      />
                      <span>Fatture scadute</span>
                    </label>
                    <div className="inline-actions analisi-inline-actions">
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
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Dettaglio Fatturato</h3>
                  </header>

                  {analisiDettaglioFatturatoRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {analisiDettaglioFatturatoRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Data</th>
                            <th>Commessa</th>
                            <th>Business Unit</th>
                            <th>Controparte</th>
                            <th>Provenienza</th>
                            <th className="num">Fatturato</th>
                            <th className="num">Fatturato futuro</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Descrizione Mastro</th>
                            <th>Descrizione Conto</th>
                            <th>Descrizione Sottoconto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiDettaglioFatturatoRows.map((row, index) => (
                            <tr key={`analisi-dettaglio-fatturato-row-${row.commessa}-${row.data ?? 'na'}-${index}`}>
                              <td>{row.anno}</td>
                              <td>{formatDate(row.data)}</td>
                              <td>{row.commessa}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.controparte}</td>
                              <td>{row.provenienza}</td>
                              <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                              <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                              <td className={`num ${row.ricavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoIpotetico)}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{row.descrizioneMastro}</td>
                              <td>{row.descrizioneConto}</td>
                              <td>{row.descrizioneSottoconto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>

  )
}
