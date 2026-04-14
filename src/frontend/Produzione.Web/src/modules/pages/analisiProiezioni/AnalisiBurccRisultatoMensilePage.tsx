// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiBurccRisultatoMensilePageProps = any

export function AnalisiBurccRisultatoMensilePage(props: AnalisiBurccRisultatoMensilePageProps) {
  const {
    analisiBurccAnno,
    analisiBurccBusinessUnit,
    analisiBurccBusinessUnitOptions,
    analisiBurccData,
    analisiBurccGrids,
    analisiBurccRcc,
    analisiBurccRccOptions,
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessAnalisiBurccPage,
    canExportAnalisiPage,
    canSelectAnalisiBurccBusinessUnit,
    canSelectAnalisiBurccRcc,
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
    setAnalisiBurccAnno,
    setAnalisiBurccBusinessUnit,
    setAnalisiBurccRcc,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Proiezione Mensile RCC-BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiBurccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiBurccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-anno">
                      <span>Anno Snapshot</span>
                      <input
                        id="analisi-burcc-anno"
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={analisiBurccAnno}
                        onChange={(event) => setAnalisiBurccAnno(event.target.value)}
                      />
                    </label>
                    {canSelectAnalisiBurccBusinessUnit && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-bu">
                        <span>BU</span>
                        <select
                          id="analisi-burcc-bu"
                          value={analisiBurccBusinessUnit}
                          onChange={(event) => setAnalisiBurccBusinessUnit(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {analisiBurccBusinessUnitOptions.map((value) => (
                            <option key={`analisi-burcc-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {canSelectAnalisiBurccRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-burcc-rcc"
                          value={analisiBurccRcc}
                          onChange={(event) => setAnalisiBurccRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiBurccRccOptions.map((value) => (
                            <option key={`analisi-burcc-rcc-${value}`} value={value}>
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
                  {analisiBurccData && analisiBurccGrids.length > 0 && analisiBurccGrids.map((grid) => (
                    <section key={`burcc-${grid.titolo}`} className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{grid.titolo}</h3>
                      </header>
                      {grid.righe.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {grid.righe.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main analisi-rcc-table-wrap">
                          {(() => {
                            const hasBurccSplitColumns = grid.righe.some((row) => (
                              (row.businessUnit ?? '').trim().length > 0 || (row.rcc ?? '').trim().length > 0
                            ))
                            return (
                          <table className="bonifici-table analisi-rcc-table">
                            <thead>
                              <tr>
                                {hasBurccSplitColumns
                                  ? (
                                    <>
                                      <th>BU</th>
                                      <th>RCC</th>
                                    </>
                                  )
                                  : <th>Aggregazione</th>}
                                {!grid.valoriPercentuali && <th className="num">Budget</th>}
                                {grid.mesi.map((mese) => (
                                  <th key={`burcc-${grid.titolo}-mese-${mese}`} className="num">{mese.toString().padStart(2, '0')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grid.righe.map((row) => {
                                const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                                const budgetValue = Number(row.budget ?? 0)
                                return (
                                  <tr key={`burcc-${grid.titolo}-${row.aggregazione}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                    {hasBurccSplitColumns
                                      ? (
                                        <>
                                          <td>{isTotalRow ? row.aggregazione : (row.businessUnit ?? row.aggregazione)}</td>
                                          <td>{isTotalRow ? '' : (row.rcc ?? '')}</td>
                                        </>
                                      )
                                      : <td>{row.aggregazione}</td>}
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
                                          key={`burcc-${grid.titolo}-${row.aggregazione}-${mese}`}
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
                            )
                          })()}
                        </div>
                      )}
                    </section>
                  ))}
                  {!analisiRccLoading && (!analisiBurccData || analisiBurccGrids.every((grid) => grid.righe.length === 0)) && (
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
