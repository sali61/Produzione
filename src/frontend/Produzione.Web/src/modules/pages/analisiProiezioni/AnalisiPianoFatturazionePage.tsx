// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiPianoFatturazionePageProps = any

export function AnalisiPianoFatturazionePage(props: AnalisiPianoFatturazionePageProps) {
  const {
    analisiPageCountLabel,
    analisiPianoFatturazioneAnno,
    analisiPianoFatturazioneAnnoOptions,
    analisiPianoFatturazioneBusinessUnit,
    analisiPianoFatturazioneBusinessUnitOptions,
    analisiPianoFatturazioneMesiRiferimento,
    analisiPianoFatturazioneMesiSnapshot,
    analisiPianoFatturazioneMesiSnapshotOptions,
    analisiPianoFatturazioneProgressRows,
    analisiPianoFatturazioneRcc,
    analisiPianoFatturazioneRccOptions,
    analisiPianoFatturazioneRows,
    analisiPianoFatturazioneTipoCalcolo,
    analisiRccLoading,
    canAccessAnalisiPianoFatturazionePage,
    canExportAnalisiPage,
    canSelectAnalisiPianoFatturazioneBusinessUnit,
    canSelectAnalisiPianoFatturazioneRcc,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    formatPercentRatioUnbounded,
    formatReferenceMonthLabel,
    Fragment,
    getAnalisiPianoFatturazioneProgressAmountForMonth,
    getAnalisiPianoFatturazioneProgressPercentForMonth,
    getAnalisiPianoFatturazioneQuarterTotal,
    getAnalisiPianoFatturazioneValueForMonth,
    getQuarterFromMonth,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    isQuarterEndMonth,
    resetAnalisiFilters,
    setAnalisiPianoFatturazioneAnno,
    setAnalisiPianoFatturazioneBusinessUnit,
    setAnalisiPianoFatturazioneMesiSnapshot,
    setAnalisiPianoFatturazioneRcc,
    setAnalisiPianoFatturazioneTipoCalcolo,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Piano Fatturazione</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiPianoFatturazionePage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiPianoFatturazionePage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-anno">
                      <span>Anno</span>
                      <select
                        id="analisi-piano-fatturazione-anno"
                        value={analisiPianoFatturazioneAnno}
                        onChange={(event) => setAnalisiPianoFatturazioneAnno(event.target.value)}
                      >
                        {analisiPianoFatturazioneAnnoOptions.map((year) => (
                          <option key={`analisi-piano-fatturazione-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-mesi-snapshot">
                      <span>Mesi snapshot</span>
                      <select
                        id="analisi-piano-fatturazione-mesi-snapshot"
                        multiple
                        size={4}
                        value={analisiPianoFatturazioneMesiSnapshot}
                        onChange={(event) => setAnalisiPianoFatturazioneMesiSnapshot(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiPianoFatturazioneMesiSnapshotOptions.map((month) => (
                          <option key={`analisi-piano-fatturazione-snapshot-${month}`} value={month.toString()}>
                            {formatReferenceMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-tipo-calcolo">
                      <span>Tipo calcolo</span>
                      <select
                        id="analisi-piano-fatturazione-tipo-calcolo"
                        value={analisiPianoFatturazioneTipoCalcolo}
                        onChange={(event) => setAnalisiPianoFatturazioneTipoCalcolo(event.target.value)}
                      >
                        <option value="complessivo">Complessivo</option>
                        <option value="fatturato">Fatturato</option>
                        <option value="futuro">Futuro</option>
                      </select>
                    </label>
                    {canSelectAnalisiPianoFatturazioneBusinessUnit && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-business-unit">
                        <span>BU</span>
                        <select
                          id="analisi-piano-fatturazione-business-unit"
                          value={analisiPianoFatturazioneBusinessUnit}
                          onChange={(event) => setAnalisiPianoFatturazioneBusinessUnit(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {analisiPianoFatturazioneBusinessUnitOptions.map((value) => (
                            <option key={`analisi-piano-fatturazione-business-unit-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {canSelectAnalisiPianoFatturazioneRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-piano-fatturazione-rcc"
                          value={analisiPianoFatturazioneRcc}
                          onChange={(event) => setAnalisiPianoFatturazioneRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiPianoFatturazioneRccOptions.map((value) => (
                            <option key={`analisi-piano-fatturazione-rcc-${value}`} value={value}>
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

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Piano Fatturazione - Valori</h3>
                  </header>
                  {analisiPianoFatturazioneRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {analisiPianoFatturazioneRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>RCC</th>
                            <th className="num">Budget</th>
                            {analisiPianoFatturazioneMesiRiferimento.map((mese) => (
                              <Fragment key={`analisi-piano-fatturazione-mese-head-${mese}`}>
                                <th className="num">
                                  {formatReferenceMonthLabel(mese).slice(5)}
                                </th>
                                {isQuarterEndMonth(mese) && (
                                  <th className="num piano-quarter-total-col">
                                    Trim{getQuarterFromMonth(mese)} Totale
                                  </th>
                                )}
                              </Fragment>
                            ))}
                            <th className="num">Totale complessivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiPianoFatturazioneRows.map((row) => (
                            <tr key={`analisi-piano-fatturazione-row-${row.rcc}`} className={row.isTotale ? 'table-totals-row' : ''}>
                              <td>{row.rcc}</td>
                              <td className={`num ${row.budget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budget)}</td>
                              {analisiPianoFatturazioneMesiRiferimento.map((mese) => {
                                const value = getAnalisiPianoFatturazioneValueForMonth(row, mese)
                                const quarter = getQuarterFromMonth(mese)
                                const quarterTotal = getAnalisiPianoFatturazioneQuarterTotal(row, quarter)
                                return (
                                  <Fragment key={`analisi-piano-fatturazione-value-wrap-${row.rcc}-${mese}`}>
                                    <td className={`num ${value < 0 ? 'num-negative' : ''}`}>
                                      {formatNumber(value)}
                                    </td>
                                    {isQuarterEndMonth(mese) && (
                                      <td className={`num piano-quarter-total-col ${quarterTotal < 0 ? 'num-negative' : ''}`}>
                                        {formatNumber(quarterTotal)}
                                      </td>
                                    )}
                                  </Fragment>
                                )
                              })}
                              <td className={`num ${row.totaleComplessivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleComplessivo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Piano Fatturazione - Progressivo % Budget</h3>
                  </header>
                  {analisiPianoFatturazioneProgressRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {analisiPianoFatturazioneProgressRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>RCC</th>
                            <th className="num">Budget</th>
                            {analisiPianoFatturazioneMesiRiferimento.map((mese) => (
                              <th key={`analisi-piano-fatturazione-progress-mese-${mese}`} className="num">
                                {formatReferenceMonthLabel(mese).slice(5)}
                              </th>
                            ))}
                            <th className="num">Importo totale prog.</th>
                            <th className="num">% Totale su Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiPianoFatturazioneProgressRows.map((row) => (
                            <tr key={`analisi-piano-fatturazione-progress-row-${row.rcc}`} className={row.isTotale ? 'table-totals-row' : ''}>
                              <td>{row.rcc}</td>
                              <td className={`num ${row.budget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budget)}</td>
                              {analisiPianoFatturazioneMesiRiferimento.map((mese) => {
                                const importo = getAnalisiPianoFatturazioneProgressAmountForMonth(row, mese)
                                const percentuale = getAnalisiPianoFatturazioneProgressPercentForMonth(row, mese)
                                return (
                                  <td key={`analisi-piano-fatturazione-progress-value-${row.rcc}-${mese}`} className="num">
                                    <div className={`piano-progress-amount ${importo < 0 ? 'num-negative' : ''}`}>{formatNumber(importo)}</div>
                                    <div className={`piano-progress-percent ${percentuale < 0 ? 'num-negative' : ''}`}>{formatPercentRatioUnbounded(percentuale)}</div>
                                  </td>
                                )
                              })}
                              <td className={`num ${row.importoTotaleProgressivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoTotaleProgressivo)}</td>
                              <td className={`num ${row.percentualeTotaleBudget < 0 ? 'num-negative' : ''}`}>{formatPercentRatioUnbounded(row.percentualeTotaleBudget)}</td>
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
