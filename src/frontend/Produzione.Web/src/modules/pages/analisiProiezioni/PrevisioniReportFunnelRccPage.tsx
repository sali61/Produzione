// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type PrevisioniReportFunnelRccPageProps = any

export function PrevisioniReportFunnelRccPage(props: PrevisioniReportFunnelRccPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessPrevisioniFunnelRccPage,
    canExportAnalisiPage,
    canSelectPrevisioniFunnelRcc,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    previsioniReportFunnelRcc,
    previsioniReportFunnelRccAnnoOptions,
    previsioniReportFunnelRccAnnoSelezionato,
    previsioniReportFunnelRccData,
    previsioniReportFunnelRccHasMultipleAggregazioni,
    previsioniReportFunnelRccOptions,
    previsioniReportFunnelRccPivotRows,
    previsioniReportFunnelRccTotaliDettaglioRows,
    previsioniReportFunnelRccTotaliPerAnno,
    resetAnalisiFilters,
    setPrevisioniReportFunnelRcc,
    setPrevisioniReportFunnelRccAnni,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Report Funnel RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniFunnelRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessPrevisioniFunnelRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-rcc-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-report-funnel-rcc-anno"
                        value={previsioniReportFunnelRccAnnoSelezionato}
                        onChange={(event) => setPrevisioniReportFunnelRccAnni([event.target.value])}
                      >
                        {previsioniReportFunnelRccAnnoOptions.map((year) => (
                          <option key={`previsioni-report-funnel-rcc-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-rcc-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-report-funnel-rcc-rcc"
                          value={previsioniReportFunnelRcc}
                          onChange={(event) => setPrevisioniReportFunnelRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniReportFunnelRccOptions.map((value) => (
                            <option key={`previsioni-report-funnel-rcc-${value}`} value={value}>
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
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniReportFunnelRccData
                        ? `Anno ${previsioniReportFunnelRccAnnoSelezionato}. Visibilita: ${previsioniReportFunnelRccData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniReportFunnelRccData.aggregazioneFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniReportFunnelRccData ? `${previsioniReportFunnelRccPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Funnel RCC</h3>
                  </header>

                  {previsioniReportFunnelRccPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniReportFunnelRccPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccPivotRows.map((row) => (
                            <tr key={row.key} className={`funnel-pivot-row level-${row.livello}`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>{previsioniReportFunnelRccHasMultipleAggregazioni ? 'Totali per anno (ripartiti per tipo/% successo)' : 'Totali per anno'}</h3>
                  </header>
                  {previsioniReportFunnelRccTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniReportFunnelRccHasMultipleAggregazioni && previsioniReportFunnelRccTotaliDettaglioRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccTotaliDettaglioRows.map((row) => (
                            <tr key={`previsioni-report-funnel-rcc-totale-dettaglio-${row.key}`} className={`funnel-pivot-row level-${row.livello} table-totals-row`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!previsioniReportFunnelRccHasMultipleAggregazioni && previsioniReportFunnelRccTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-report-funnel-rcc-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
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
