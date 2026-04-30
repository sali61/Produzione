// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiBurccPivotFatturatoPageProps = any

export function AnalisiBurccPivotFatturatoPage(props: AnalisiBurccPivotFatturatoPageProps) {
  const {
    analisiBurccPivotAnni,
    analisiBurccPivotAnnoOptions,
    analisiBurccPivotBusinessUnit,
    analisiBurccPivotBusinessUnitOptions,
    analisiBurccPivotOrder,
    analisiBurccPivotRcc,
    analisiBurccPivotRccOptions,
    analisiBurccPivotRows,
    analisiBurccPivotTotaliPerAnno,
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessAnalisiBurccPage,
    canExportAnalisiPage,
    canSelectAnalisiBurccBusinessUnit,
    canSelectAnalisiBurccRcc,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiBurccPivotAnni,
    setAnalisiBurccPivotBusinessUnit,
    setAnalisiBurccPivotOrder,
    setAnalisiBurccPivotRcc,
    toggleAnalisiSearchCollapsed
  } = props as any

  const getPercentValue = (numeratore: number, budgetPrevisto: number) => {
    const budget = Number.isFinite(budgetPrevisto) ? budgetPrevisto : 0
    if (Math.abs(budget) < 0.0000001) {
      return null
    }

    return (numeratore / budget) * 100
  }
  const getPercentValueFromRatio = (ratioValue: number | null | undefined) => (
    Number.isFinite(ratioValue) ? ratioValue * 100 : null
  )

  const getTotaleOttimistico = (row: any) => row.totaleFatturatoCerto + row.totaleRicavoIpotetico
  const getTotalePesato = (row: any) => (
    Number.isFinite(row.totaleIpotetico)
      ? row.totaleIpotetico
      : (row.totaleFatturatoCerto + row.totaleRicavoIpoteticoPesato)
  )
  const getPercentualeTotale = (row: any) => getPercentValue(getTotaleOttimistico(row), row.budgetPrevisto)
  const getPercentualePesato = (row: any) => (
    Number.isFinite(row.percentualeCompresoRicavoIpotetico)
      ? row.percentualeCompresoRicavoIpotetico * 100
      : getPercentValue(getTotalePesato(row), row.budgetPrevisto)
  )

  const renderPercent = (value: number | null | undefined) => (
    value === null || value === undefined ? '-' : formatAnalisiRccPercent(value)
  )

  const getPercentClassName = (value: number | null | undefined) => (
    `num percent-col ${value !== null && value !== undefined && isAnalisiRccPercentUnderTarget(value) ? 'num-under-target' : ''}`
  )
  const firstAggregationLabel = analisiBurccPivotOrder === 'rcc-bu' ? 'RCC' : 'BU'
  const secondAggregationLabel = analisiBurccPivotOrder === 'rcc-bu' ? 'BU' : 'RCC'
  const firstAggregationValue = (row: any) => (
    analisiBurccPivotOrder === 'rcc-bu' ? row.rcc : row.businessUnit
  )
  const secondAggregationValue = (row: any) => (
    analisiBurccPivotOrder === 'rcc-bu' ? row.businessUnit : row.rcc
  )

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Proiezioni - Report Annuale RCC-BU</h2>
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
              <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-anni">
                <span>Anni confronto</span>
                <select
                  id="analisi-burcc-pivot-anni"
                  multiple
                  size={4}
                  value={analisiBurccPivotAnni}
                  onChange={(event) => setAnalisiBurccPivotAnni(
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )}
                >
                  {analisiBurccPivotAnnoOptions.map((year) => (
                    <option key={`analisi-burcc-pivot-anno-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-ordine">
                <span>Ordine aggregazione</span>
                <select
                  id="analisi-burcc-pivot-ordine"
                  value={analisiBurccPivotOrder}
                  onChange={(event) => setAnalisiBurccPivotOrder(event.target.value)}
                >
                  <option value="rcc-bu">RCC &gt; BU</option>
                  <option value="bu-rcc">BU &gt; RCC</option>
                </select>
              </label>
              {canSelectAnalisiBurccBusinessUnit && (
                <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-bu">
                  <span>BU</span>
                  <select
                    id="analisi-burcc-pivot-bu"
                    value={analisiBurccPivotBusinessUnit}
                    onChange={(event) => setAnalisiBurccPivotBusinessUnit(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {analisiBurccPivotBusinessUnitOptions.map((value) => (
                      <option key={`analisi-burcc-pivot-bu-${value}`} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {canSelectAnalisiBurccRcc && (
                <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-rcc">
                  <span>RCC</span>
                  <select
                    id="analisi-burcc-pivot-rcc"
                    value={analisiBurccPivotRcc}
                    onChange={(event) => setAnalisiBurccPivotRcc(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {analisiBurccPivotRccOptions.map((value) => (
                      <option key={`analisi-burcc-pivot-rcc-${value}`} value={value}>
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
              <h3>Report Annuale RCC-BU</h3>
            </header>

            {analisiBurccPivotRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}

            {analisiBurccPivotRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>{firstAggregationLabel}</th>
                      <th>{secondAggregationLabel}</th>
                      <th className="num">Budget Previsto</th>
                      <th className="num">Fatturato gia registrato</th>
                      <th className="num">Fatturato Futuro Anno</th>
                      <th className="num">Totale Fatturato Certo</th>
                      <th className="num">Margine Fatturato Budget</th>
                      <th className="num percent-col">% Certa Raggiunta</th>
                      <th className="num percent-col">% Raggiunta Oggi</th>
                      <th className="num">Funnel</th>
                      <th className="num">Totale Ottimistico</th>
                      <th className="num percent-col">% Totale</th>
                      <th className="num">Funnel Pesato</th>
                      <th className="num">Totale Pesato</th>
                      <th className="num percent-col">% Pesato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisiBurccPivotRows.map((row) => {
                      const percentualeTotale = getPercentualeTotale(row)
                      const percentualePesato = getPercentualePesato(row)
                      const percentualeCertaRaggiunta = getPercentValueFromRatio(row.percentualeCertaRaggiunta)
                      const percentualeRaggiungimentoTemporale = getPercentValueFromRatio(row.percentualeRaggiungimentoTemporale)
                      const totaleOttimistico = getTotaleOttimistico(row)
                      const totalePesato = getTotalePesato(row)

                      return (
                        <tr key={`analisi-burcc-pivot-${row.anno}-${row.businessUnit}-${row.rcc}`}>
                          <td>{row.anno}</td>
                          <td>{firstAggregationValue(row)}</td>
                          <td>{secondAggregationValue(row)}</td>
                          <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                          <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                          <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                          <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                          <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                          <td className={getPercentClassName(percentualeCertaRaggiunta)}>{renderPercent(percentualeCertaRaggiunta)}</td>
                          <td className={getPercentClassName(percentualeRaggiungimentoTemporale)}>{renderPercent(percentualeRaggiungimentoTemporale)}</td>
                          <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                          <td className={`num ${totaleOttimistico < 0 ? 'num-negative' : ''}`}>{formatNumber(totaleOttimistico)}</td>
                          <td className={getPercentClassName(percentualeTotale)}>{renderPercent(percentualeTotale)}</td>
                          <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                          <td className={`num ${totalePesato < 0 ? 'num-negative' : ''}`}>{formatNumber(totalePesato)}</td>
                          <td className={getPercentClassName(percentualePesato)}>{renderPercent(percentualePesato)}</td>
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
            {analisiBurccPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
            )}
            {analisiBurccPivotTotaliPerAnno.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th className="num">Budget Previsto</th>
                      <th className="num">Fatturato gia registrato</th>
                      <th className="num">Fatturato Futuro Anno</th>
                      <th className="num">Totale Fatturato Certo</th>
                      <th className="num">Margine Fatturato Budget</th>
                      <th className="num percent-col">% Certa Raggiunta</th>
                      <th className="num percent-col">% Raggiunta Oggi</th>
                      <th className="num">Funnel</th>
                      <th className="num">Totale Ottimistico</th>
                      <th className="num percent-col">% Totale</th>
                      <th className="num">Funnel Pesato</th>
                      <th className="num">Totale Pesato</th>
                      <th className="num percent-col">% Pesato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisiBurccPivotTotaliPerAnno.map((row) => {
                      const percentualeTotale = getPercentualeTotale(row)
                      const percentualePesato = getPercentualePesato(row)
                      const percentualeCertaRaggiunta = getPercentValueFromRatio(row.percentualeCertaRaggiunta)
                      const percentualeRaggiungimentoTemporale = getPercentValueFromRatio(row.percentualeRaggiungimentoTemporale)
                      const totaleOttimistico = getTotaleOttimistico(row)
                      const totalePesato = getTotalePesato(row)

                      return (
                        <tr key={`analisi-burcc-pivot-totale-${row.anno}`} className="table-totals-row">
                          <td>{row.anno}</td>
                          <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                          <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                          <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                          <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                          <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                          <td className={getPercentClassName(percentualeCertaRaggiunta)}>{renderPercent(percentualeCertaRaggiunta)}</td>
                          <td className={getPercentClassName(percentualeRaggiungimentoTemporale)}>{renderPercent(percentualeRaggiungimentoTemporale)}</td>
                          <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                          <td className={`num ${totaleOttimistico < 0 ? 'num-negative' : ''}`}>{formatNumber(totaleOttimistico)}</td>
                          <td className={getPercentClassName(percentualeTotale)}>{renderPercent(percentualeTotale)}</td>
                          <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                          <td className={`num ${totalePesato < 0 ? 'num-negative' : ''}`}>{formatNumber(totalePesato)}</td>
                          <td className={getPercentClassName(percentualePesato)}>{renderPercent(percentualePesato)}</td>
                        </tr>
                      )
                    })}
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
