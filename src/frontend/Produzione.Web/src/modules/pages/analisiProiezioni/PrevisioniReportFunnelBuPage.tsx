// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type PrevisioniReportFunnelBuPageProps = any

export function PrevisioniReportFunnelBuPage(props: PrevisioniReportFunnelBuPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessPrevisioniFunnelBuPage,
    canExportAnalisiPage,
    canSelectPrevisioniFunnelBu,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    previsioniReportFunnelBu,
    previsioniReportFunnelBuAnnoOptions,
    previsioniReportFunnelBuAnnoSelezionato,
    previsioniReportFunnelBuData,
    previsioniReportFunnelBuHasMultipleAggregazioni,
    previsioniReportFunnelBuOptions,
    previsioniReportFunnelBuPivotRows,
    previsioniReportFunnelBuRcc,
    previsioniReportFunnelBuRccOptions,
    previsioniReportFunnelBuTotaliDettaglioRows,
    previsioniReportFunnelBuTotaliPerAnno,
    resetAnalisiFilters,
    setPrevisioniReportFunnelBu,
    setPrevisioniReportFunnelBuAnni,
    setPrevisioniReportFunnelBuRcc,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Report Funnel BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniFunnelBuPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessPrevisioniFunnelBuPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-report-funnel-bu-anno"
                        value={previsioniReportFunnelBuAnnoSelezionato}
                        onChange={(event) => setPrevisioniReportFunnelBuAnni([event.target.value])}
                      >
                        {previsioniReportFunnelBuAnnoOptions.map((year) => (
                          <option key={`previsioni-report-funnel-bu-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelBu && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-bu">
                        <span>BU</span>
                        <select
                          id="previsioni-report-funnel-bu-bu"
                          value={previsioniReportFunnelBu}
                          onChange={(event) => setPrevisioniReportFunnelBu(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {previsioniReportFunnelBuOptions.map((value) => (
                            <option key={`previsioni-report-funnel-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-rcc">
                      <span>RCC</span>
                      <select
                        id="previsioni-report-funnel-bu-rcc"
                        value={previsioniReportFunnelBuRcc}
                        onChange={(event) => setPrevisioniReportFunnelBuRcc(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniReportFunnelBuRccOptions.map((value) => (
                          <option key={`previsioni-report-funnel-bu-rcc-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
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
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniReportFunnelBuData
                        ? `Anno ${previsioniReportFunnelBuAnnoSelezionato}. Visibilita: ${previsioniReportFunnelBuData.vediTutto ? 'tutte le BU' : `solo ${previsioniReportFunnelBuData.aggregazioneFiltro || 'BU corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniReportFunnelBuData ? `${previsioniReportFunnelBuPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Funnel BU</h3>
                  </header>

                  {previsioniReportFunnelBuPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniReportFunnelBuPivotRows.length > 0 && (
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
                          {previsioniReportFunnelBuPivotRows.map((row) => (
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
                    <h3>{previsioniReportFunnelBuHasMultipleAggregazioni ? 'Totali per anno (ripartiti per tipo/% successo)' : 'Totali per anno'}</h3>
                  </header>
                  {previsioniReportFunnelBuTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniReportFunnelBuHasMultipleAggregazioni && previsioniReportFunnelBuTotaliDettaglioRows.length > 0 && (
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
                          {previsioniReportFunnelBuTotaliDettaglioRows.map((row) => (
                            <tr key={`previsioni-report-funnel-bu-totale-dettaglio-${row.key}`} className={`funnel-pivot-row level-${row.livello} table-totals-row`}>
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
                  {!previsioniReportFunnelBuHasMultipleAggregazioni && previsioniReportFunnelBuTotaliPerAnno.length > 0 && (
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
                          {previsioniReportFunnelBuTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-report-funnel-bu-totale-${row.anno}`} className="table-totals-row">
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
