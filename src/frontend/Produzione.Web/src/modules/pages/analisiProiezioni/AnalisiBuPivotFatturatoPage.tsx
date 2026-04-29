// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiBuPivotFatturatoPageProps = any

export function AnalisiBuPivotFatturatoPage(props: AnalisiBuPivotFatturatoPageProps) {
  const {
    analisiBuPivotAnni,
    analisiBuPivotAnnoOptions,
    analisiBuPivotBusinessUnit,
    analisiBuPivotBusinessUnitOptions,
    analisiBuPivotRows,
    analisiBuPivotTotaliPerAnno,
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessAnalisiBuPage,
    canExportAnalisiPage,
    canSelectAnalisiBuPivotBusinessUnit,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiBuPivotAnni,
    setAnalisiBuPivotBusinessUnit,
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

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Proiezioni - Report Annuale BU</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      {!canAccessAnalisiBuPage && (
        <p className="empty-state">
          Il profilo corrente non e' abilitato a questa analisi.
        </p>
      )}

      {canAccessAnalisiBuPage && (
        <>
          <section className="panel sintesi-filter-panel">
            <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
              <label className="analisi-rcc-year-field" htmlFor="analisi-bu-pivot-anni">
                <span>Anni confronto</span>
                <select
                  id="analisi-bu-pivot-anni"
                  multiple
                  size={4}
                  value={analisiBuPivotAnni}
                  onChange={(event) => setAnalisiBuPivotAnni(
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )}
                >
                  {analisiBuPivotAnnoOptions.map((year) => (
                    <option key={`analisi-bu-pivot-anno-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              {canSelectAnalisiBuPivotBusinessUnit && (
                <label className="analisi-rcc-year-field" htmlFor="analisi-bu-pivot-bu">
                  <span>BU</span>
                  <select
                    id="analisi-bu-pivot-bu"
                    value={analisiBuPivotBusinessUnit}
                    onChange={(event) => setAnalisiBuPivotBusinessUnit(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {analisiBuPivotBusinessUnitOptions.map((value) => (
                      <option key={`analisi-bu-pivot-bu-${value}`} value={value}>
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
              <h3>Report Annuale BU</h3>
            </header>

            {analisiBuPivotRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}

            {analisiBuPivotRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>BU</th>
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
                    {analisiBuPivotRows.map((row) => {
                      const isTotalRow = row.rcc.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                      const percentualeTotale = getPercentualeTotale(row)
                      const percentualePesato = getPercentualePesato(row)
                      const percentualeCertaRaggiunta = getPercentValueFromRatio(row.percentualeCertaRaggiunta)
                      const percentualeRaggiungimentoTemporale = getPercentValueFromRatio(row.percentualeRaggiungimentoTemporale)
                      const totaleOttimistico = getTotaleOttimistico(row)
                      const totalePesato = getTotalePesato(row)
                      return (
                        <tr key={`analisi-bu-pivot-${row.anno}-${row.rcc}`} className={isTotalRow ? 'table-totals-row' : ''}>
                          <td>{row.anno}</td>
                          <td>{row.rcc}</td>
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
            {analisiBuPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
            )}
            {analisiBuPivotTotaliPerAnno.length > 0 && (
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
                    {analisiBuPivotTotaliPerAnno.map((row) => {
                      const percentualeTotale = getPercentualeTotale(row)
                      const percentualePesato = getPercentualePesato(row)
                      const percentualeCertaRaggiunta = getPercentValueFromRatio(row.percentualeCertaRaggiunta)
                      const percentualeRaggiungimentoTemporale = getPercentValueFromRatio(row.percentualeRaggiungimentoTemporale)
                      const totaleOttimistico = getTotaleOttimistico(row)
                      const totalePesato = getTotalePesato(row)
                      return (
                        <tr key={`analisi-bu-pivot-totale-${row.anno}`} className="table-totals-row">
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
