// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type PrevisioniUtileMensileRccPageProps = any

export function PrevisioniUtileMensileRccPage(props: PrevisioniUtileMensileRccPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessPrevisioniUtileMensileRccPage,
    canExportAnalisiPage,
    canSelectPrevisioniUtileMensileRcc,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatNumber,
    formatReferenceMonthLabel,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    mesiItaliani,
    previsioniUtileMensileRcc,
    previsioniUtileMensileRccAnno,
    previsioniUtileMensileRccAnnoOptions,
    previsioniUtileMensileRccData,
    previsioniUtileMensileRccMeseRiferimento,
    previsioniUtileMensileRccMeseRiferimentoValue,
    previsioniUtileMensileRccOptions,
    previsioniUtileMensileRccProduzione,
    previsioniUtileMensileRccRows,
    previsioniUtileMensileRccTotaliPerAnno,
    resetAnalisiFilters,
    setPrevisioniUtileMensileRcc,
    setPrevisioniUtileMensileRccAnno,
    setPrevisioniUtileMensileRccMeseRiferimento,
    setPrevisioniUtileMensileRccProduzione,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Utile Mensile RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniUtileMensileRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa pagina.
              </p>
            )}

            {canAccessPrevisioniUtileMensileRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-utile-rcc-anno"
                        value={previsioniUtileMensileRccAnno}
                        onChange={(event) => setPrevisioniUtileMensileRccAnno(event.target.value)}
                      >
                        {previsioniUtileMensileRccAnnoOptions.map((year) => (
                          <option key={`previsioni-utile-rcc-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-mese-riferimento">
                      <span>Mese riferimento</span>
                      <select
                        id="previsioni-utile-rcc-mese-riferimento"
                        value={previsioniUtileMensileRccMeseRiferimento}
                        onChange={(event) => setPrevisioniUtileMensileRccMeseRiferimento(event.target.value)}
                      >
                        {mesiItaliani.map((mese, index) => {
                          const monthValue = (index + 1).toString()
                          return (
                            <option key={`previsioni-utile-rcc-mese-${monthValue}`} value={monthValue}>
                              {`${monthValue.padStart(2, '0')} - ${mese}`}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                    {canSelectPrevisioniUtileMensileRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-utile-rcc-rcc"
                          value={previsioniUtileMensileRcc}
                          onChange={(event) => setPrevisioniUtileMensileRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniUtileMensileRccOptions.map((value) => (
                            <option key={`previsioni-utile-rcc-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-produzione">
                      <span>Produzione</span>
                      <select
                        id="previsioni-utile-rcc-produzione"
                        value={previsioniUtileMensileRccProduzione}
                        onChange={(event) => setPrevisioniUtileMensileRccProduzione(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        <option value="1">1</option>
                        <option value="0">0</option>
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
                      {previsioniUtileMensileRccData
                        ? `Anno ${previsioniUtileMensileRccAnno}. Visibilita: ${previsioniUtileMensileRccData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniUtileMensileRccData.aggregazioneFiltro || 'RCC corrente'}`}. Mese riferimento: ${formatReferenceMonthLabel(previsioniUtileMensileRccMeseRiferimentoValue)}.`
                        : statusMessageVisible}
                    </p>
                    <div className="sintesi-toolbar-badges">
                      <span className="status-badge neutral">
                        Mese rif.: {formatReferenceMonthLabel(previsioniUtileMensileRccMeseRiferimentoValue)}
                      </span>
                      <span className="status-badge neutral">
                        {previsioniUtileMensileRccData ? `${previsioniUtileMensileRccRows.length} righe` : '0 righe'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Utile Mensile RCC</h3>
                  </header>
                  {previsioniUtileMensileRccRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileRccRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileRccRows.map((row) => (
                            <tr key={`previsioni-utile-rcc-${row.anno}-${row.aggregazione}`}>
                              <td>{row.anno}</td>
                              <td>{row.aggregazione}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
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
                  {previsioniUtileMensileRccTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileRccTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileRccTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-utile-rcc-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
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
