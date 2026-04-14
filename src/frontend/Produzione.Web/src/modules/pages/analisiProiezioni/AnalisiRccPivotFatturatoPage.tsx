// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiRccPivotFatturatoPageProps = any

export function AnalisiRccPivotFatturatoPage(props: AnalisiRccPivotFatturatoPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    analisiRccPivotAnni,
    analisiRccPivotAnnoOptions,
    analisiRccPivotRcc,
    analisiRccPivotRccOptions,
    analisiRccPivotRows,
    analisiRccPivotTotaliPerAnno,
    canAccessAnalisiRccPage,
    canExportAnalisiPage,
    canSelectAnalisiRccPivotRcc,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiRccPivotAnni,
    setAnalisiRccPivotRcc,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Report Annuale RCC</h2>
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
                    <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-pivot-anni">
                      <span>Anni confronto</span>
                      <select
                        id="analisi-rcc-pivot-anni"
                        multiple
                        size={4}
                        value={analisiRccPivotAnni}
                        onChange={(event) => setAnalisiRccPivotAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiRccPivotAnnoOptions.map((year) => (
                          <option key={`analisi-rcc-pivot-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectAnalisiRccPivotRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-pivot-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-rcc-pivot-rcc"
                          value={analisiRccPivotRcc}
                          onChange={(event) => setAnalisiRccPivotRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiRccPivotRccOptions.map((value) => (
                            <option key={`analisi-rcc-pivot-rcc-${value}`} value={value}>
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
                    <h3>Report Annuale RCC</h3>
                  </header>

                  {analisiRccPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {analisiRccPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">% Raggiungimento temporale</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiRccPivotRows.map((row) => {
                            const isTotalRow = row.rcc.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                            return (
                              <tr key={`analisi-rcc-pivot-${row.anno}-${row.rcc}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                <td>{row.anno}</td>
                                <td>{row.rcc}</td>
                                <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                                <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                                <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                                <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                                <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                                </td>
                                <td className={`num ${row.percentualeRaggiungimentoTemporale !== null && row.percentualeRaggiungimentoTemporale !== undefined && isAnalisiRccPercentUnderTarget(row.percentualeRaggiungimentoTemporale) ? 'num-under-target' : ''}`}>
                                  {row.percentualeRaggiungimentoTemporale === null || row.percentualeRaggiungimentoTemporale === undefined
                                    ? '-'
                                    : formatAnalisiRccPercent(row.percentualeRaggiungimentoTemporale)}
                                </td>
                                <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                                <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                                <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {analisiRccPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {analisiRccPivotTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">% Raggiungimento temporale</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiRccPivotTotaliPerAnno.map((row) => (
                            <tr key={`analisi-rcc-pivot-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                              <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                              <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                              <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                              <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                              </td>
                              <td className={`num ${row.percentualeRaggiungimentoTemporale !== null && row.percentualeRaggiungimentoTemporale !== undefined && isAnalisiRccPercentUnderTarget(row.percentualeRaggiungimentoTemporale) ? 'num-under-target' : ''}`}>
                                {row.percentualeRaggiungimentoTemporale === null || row.percentualeRaggiungimentoTemporale === undefined
                                  ? '-'
                                  : formatAnalisiRccPercent(row.percentualeRaggiungimentoTemporale)}
                              </td>
                              <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                              <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                              <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                              </td>
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
