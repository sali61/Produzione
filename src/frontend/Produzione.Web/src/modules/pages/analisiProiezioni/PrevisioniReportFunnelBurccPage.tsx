// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type PrevisioniReportFunnelBurccPageProps = any

export function PrevisioniReportFunnelBurccPage(props: PrevisioniReportFunnelBurccPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessPrevisioniFunnelBurccPage,
    canExportAnalisiPage,
    canSelectPrevisioniFunnelBurcc,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    formatAnalisiRccPercent,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    previsioniReportFunnelBurccAnnoOptions,
    previsioniReportFunnelBurccAnnoSelezionato,
    previsioniReportFunnelBurccBusinessUnit,
    previsioniReportFunnelBurccBusinessUnitOptions,
    previsioniReportFunnelBurccData,
    previsioniReportFunnelBurccOrder,
    previsioniReportFunnelBurccPercentuale,
    previsioniReportFunnelBurccPercentualeOptions,
    previsioniReportFunnelBurccPivotRows,
    previsioniReportFunnelBurccRcc,
    previsioniReportFunnelBurccRccOptions,
    previsioniReportFunnelBurccTipo,
    previsioniReportFunnelBurccTipoOptions,
    previsioniReportFunnelBurccTotaliPerAnno,
    resetAnalisiFilters,
    setPrevisioniReportFunnelBurccAnni,
    setPrevisioniReportFunnelBurccBusinessUnit,
    setPrevisioniReportFunnelBurccOrder,
    setPrevisioniReportFunnelBurccPercentuale,
    setPrevisioniReportFunnelBurccRcc,
    setPrevisioniReportFunnelBurccTipo,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed,
  } = props as any

  const rowClassName = (row: any, withTotalsClass = false) => {
    const classes = ['funnel-pivot-row', `level-${row.livello}`]
    if (row.livello === 0) {
      classes.push('funnel-total-rcc-row')
    } else if (row.livello === 1) {
      classes.push('funnel-total-tipo-row')
    } else if (row.livello === 2) {
      classes.push('funnel-detail-tipo-row')
    } else {
      classes.push('funnel-detail-percent-row')
    }
    if (withTotalsClass) {
      classes.push('table-totals-row')
    }
    return classes.join(' ')
  }

  const showBusinessUnit = (row: any) => {
    if (row.livello === 1) {
      return row.businessUnit
    }
    if (row.livello === 0 && previsioniReportFunnelBurccOrder === 'bu-rcc') {
      return row.businessUnit
    }
    return ''
  }

  const showRcc = (row: any) => {
    if (row.livello === 1) {
      return row.rcc
    }
    if (row.livello === 0 && previsioniReportFunnelBurccOrder === 'rcc-bu') {
      return row.rcc
    }
    return ''
  }

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Previsioni - Report Funnel BU RCC</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      {!canAccessPrevisioniFunnelBurccPage && (
        <p className="empty-state">
          Il profilo corrente non e' abilitato a questa analisi.
        </p>
      )}

      {canAccessPrevisioniFunnelBurccPage && (
        <>
          <section className="panel sintesi-filter-panel">
            <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
              <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-anno">
                <span>Anno</span>
                <select
                  id="previsioni-report-funnel-burcc-anno"
                  value={previsioniReportFunnelBurccAnnoSelezionato}
                  onChange={(event) => setPrevisioniReportFunnelBurccAnni([event.target.value])}
                >
                  {previsioniReportFunnelBurccAnnoOptions.map((year: string) => (
                    <option key={`previsioni-report-funnel-burcc-anno-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-ordine">
                <span>Ordine aggregazione</span>
                <select
                  id="previsioni-report-funnel-burcc-ordine"
                  value={previsioniReportFunnelBurccOrder}
                  onChange={(event) => setPrevisioniReportFunnelBurccOrder(event.target.value)}
                >
                  <option value="rcc-bu">RCC &gt; BU</option>
                  <option value="bu-rcc">BU &gt; RCC</option>
                </select>
              </label>

              {canSelectPrevisioniFunnelBurcc && (
                <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-bu">
                  <span>BU</span>
                  <select
                    id="previsioni-report-funnel-burcc-bu"
                    value={previsioniReportFunnelBurccBusinessUnit}
                    onChange={(event) => setPrevisioniReportFunnelBurccBusinessUnit(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {previsioniReportFunnelBurccBusinessUnitOptions.map((value: string) => (
                      <option key={`previsioni-report-funnel-burcc-bu-${value}`} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-rcc">
                <span>RCC</span>
                <select
                  id="previsioni-report-funnel-burcc-rcc"
                  value={previsioniReportFunnelBurccRcc}
                  onChange={(event) => setPrevisioniReportFunnelBurccRcc(event.target.value)}
                >
                  <option value="">Tutti</option>
                  {previsioniReportFunnelBurccRccOptions.map((value: string) => (
                    <option key={`previsioni-report-funnel-burcc-rcc-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-tipo">
                <span>Tipo</span>
                <select
                  id="previsioni-report-funnel-burcc-tipo"
                  value={previsioniReportFunnelBurccTipo}
                  onChange={(event) => setPrevisioniReportFunnelBurccTipo(event.target.value)}
                >
                  <option value="">Tutti</option>
                  {previsioniReportFunnelBurccTipoOptions.map((value: string) => (
                    <option key={`previsioni-report-funnel-burcc-tipo-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-burcc-percentuale">
                <span>% successo</span>
                <select
                  id="previsioni-report-funnel-burcc-percentuale"
                  value={previsioniReportFunnelBurccPercentuale}
                  onChange={(event) => setPrevisioniReportFunnelBurccPercentuale(event.target.value)}
                >
                  <option value="">Tutte</option>
                  {previsioniReportFunnelBurccPercentualeOptions.map((value: number) => (
                    <option key={`previsioni-report-funnel-burcc-percentuale-${value}`} value={value.toString()}>
                      {formatAnalisiRccPercent(value)}
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
                {previsioniReportFunnelBurccData
                  ? `Anno ${previsioniReportFunnelBurccAnnoSelezionato}.`
                  : statusMessageVisible}
              </p>
              <span className="status-badge neutral">
                {previsioniReportFunnelBurccData ? `${previsioniReportFunnelBurccPivotRows.length} righe` : '0 righe'}
              </span>
            </div>
          </section>

          <section className="panel analisi-rcc-grid-card">
            <header className="panel-header">
              <h3>Report Funnel BU RCC</h3>
            </header>

            {previsioniReportFunnelBurccPivotRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}

            {previsioniReportFunnelBurccPivotRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>BU</th>
                      <th>RCC</th>
                      <th>Tipo</th>
                      <th className="num">% Successo</th>
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
                    {previsioniReportFunnelBurccPivotRows.map((row: any) => (
                      <tr key={row.key} className={rowClassName(row)}>
                        <td>{row.livello === 0 ? row.anno : ''}</td>
                        <td>{showBusinessUnit(row)}</td>
                        <td>{showRcc(row)}</td>
                        <td>{row.livello === 2 ? row.tipo : ''}</td>
                        <td className={`num ${row.isPercentualeRow && isAnalisiRccPercentUnderTarget(row.percentualeSuccesso) ? 'num-under-target' : ''}`}>
                          {row.isPercentualeRow ? formatAnalisiRccPercent(row.percentualeSuccesso) : ''}
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
              <h3>Totali per anno</h3>
            </header>
            {previsioniReportFunnelBurccTotaliPerAnno.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
            )}
            {previsioniReportFunnelBurccTotaliPerAnno.length > 0 && (
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
                    {previsioniReportFunnelBurccTotaliPerAnno.map((row: any) => (
                      <tr key={`previsioni-report-funnel-burcc-totale-${row.anno}`} className="table-totals-row">
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
