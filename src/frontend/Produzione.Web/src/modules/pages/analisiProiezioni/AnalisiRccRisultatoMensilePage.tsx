// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiRccRisultatoMensilePageProps = any

export function AnalisiRccRisultatoMensilePage(props: AnalisiRccRisultatoMensilePageProps) {
  const {
    analisiPageCountLabel,
    analisiRccAnno,
    analisiRccData,
    analisiRccGrids,
    analisiRccLoading,
    analisiRccRcc,
    analisiRccRccOptions,
    canAccessAnalisiRccPage,
    canExportAnalisiPage,
    canSelectAnalisiRccRcc,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatCurrency,
    getAnalisiRccValueForMonth,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiRccAnno,
    setAnalisiRccRcc,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Proiezione Mensile RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-anno">
                      <span>Anno Snapshot</span>
                      <input
                        id="analisi-rcc-anno"
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={analisiRccAnno}
                        onChange={(event) => setAnalisiRccAnno(event.target.value)}
                      />
                    </label>
                    {canSelectAnalisiRccRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-rcc-rcc"
                          value={analisiRccRcc}
                          onChange={(event) => setAnalisiRccRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiRccRccOptions.map((value) => (
                            <option key={`analisi-rcc-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
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

                <section className="analisi-rcc-grids">
                  {analisiRccData && analisiRccGrids.length > 0 && analisiRccGrids.map((grid) => (
                    <section key={grid.titolo} className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{grid.titolo}</h3>
                      </header>
                      {grid.righe.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {grid.righe.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main analisi-rcc-table-wrap">
                          <table className="bonifici-table analisi-rcc-table">
                            <thead>
                              <tr>
                                <th>Aggregazione</th>
                                {!grid.valoriPercentuali && <th className="num">Budget</th>}
                                {grid.mesi.map((mese) => (
                                  <th key={`${grid.titolo}-mese-${mese}`} className="num">{mese.toString().padStart(2, '0')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grid.righe.map((row) => {
                                const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                                const budgetValue = Number(row.budget ?? 0)
                                return (
                                  <tr key={`${grid.titolo}-${row.aggregazione}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                    <td>{row.aggregazione}</td>
                                    {!grid.valoriPercentuali && (
                                      <td className={`num ${Number(row.budget ?? 0) < 0 ? 'num-negative' : ''}`}>
                                        {row.budget === null || row.budget === undefined
                                          ? ''
                                          : formatCurrency(row.budget)}
                                      </td>
                                    )}
                                    {grid.mesi.map((mese) => {
                                      const value = getAnalisiRccValueForMonth(row, mese)
                                      const isUnderBudget = !grid.valoriPercentuali &&
                                        !isTotalRow &&
                                        row.budget !== null &&
                                        row.budget !== undefined &&
                                        value < budgetValue
                                      return (
                                        <td
                                          key={`${grid.titolo}-${row.aggregazione}-${mese}`}
                                          className={`num ${grid.valoriPercentuali
                                            ? (isAnalisiRccPercentUnderTarget(value) ? 'num-under-target' : '')
                                            : (isUnderBudget ? 'num-under-target' : (value < 0 ? 'num-negative' : ''))}`}
                                        >
                                          {grid.valoriPercentuali ? formatAnalisiRccPercent(value) : formatCurrency(value)}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  ))}
                  {!analisiRccLoading && (!analisiRccData || analisiRccGrids.every((grid) => grid.righe.length === 0)) && (
                    <section className="panel">
                      <p className="empty-state">Nessun dato disponibile. Imposta l'anno e premi Aggiorna.</p>
                    </section>
                  )}
                </section>
              </>
            )}
          </section>

  )
}
