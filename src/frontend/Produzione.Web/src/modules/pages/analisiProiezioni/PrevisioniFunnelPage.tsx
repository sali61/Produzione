// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type PrevisioniFunnelPageProps = any

export function PrevisioniFunnelPage(props: PrevisioniFunnelPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessPrevisioniFunnelRccPage,
    canExportAnalisiPage,
    canSelectPrevisioniFunnelRcc,
    currentProfile,
    exportAnalisiExcel,
    formatAnalisiRccPercent,
    formatDate,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    previsioniFunnelAnni,
    previsioniFunnelAnnoOptions,
    previsioniFunnelData,
    previsioniFunnelRcc,
    previsioniFunnelRccOptions,
    previsioniFunnelRows,
    previsioniFunnelStatoDocumento,
    previsioniFunnelStatoDocumentoOptions,
    previsioniFunnelTipo,
    previsioniFunnelTipoOptions,
    previsioniFunnelTotals,
    resetAnalisiFilters,
    setPrevisioniFunnelAnni,
    setPrevisioniFunnelRcc,
    setPrevisioniFunnelStatoDocumento,
    setPrevisioniFunnelTipo,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Funnel</h2>
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
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-anni">
                      <span>Anni confronto</span>
                      <select
                        id="previsioni-funnel-anni"
                        multiple
                        size={4}
                        value={previsioniFunnelAnni}
                        onChange={(event) => setPrevisioniFunnelAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {previsioniFunnelAnnoOptions.map((year) => (
                          <option key={`previsioni-funnel-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-funnel-rcc"
                          value={previsioniFunnelRcc}
                          onChange={(event) => setPrevisioniFunnelRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniFunnelRccOptions.map((value) => (
                            <option key={`previsioni-funnel-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-tipo">
                      <span>Tipo</span>
                      <select
                        id="previsioni-funnel-tipo"
                        value={previsioniFunnelTipo}
                        onChange={(event) => setPrevisioniFunnelTipo(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniFunnelTipoOptions.map((value) => (
                          <option key={`previsioni-funnel-tipo-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-stato-documento">
                      <span>Stato documento</span>
                      <select
                        id="previsioni-funnel-stato-documento"
                        value={previsioniFunnelStatoDocumento}
                        onChange={(event) => setPrevisioniFunnelStatoDocumento(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniFunnelStatoDocumentoOptions.map((value) => (
                          <option key={`previsioni-funnel-stato-${value}`} value={value}>
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
                      {previsioniFunnelData
                        ? `Anni ${previsioniFunnelData.anni.join(', ') || '-'}. Visibilita: ${previsioniFunnelData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniFunnelData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniFunnelData ? `${previsioniFunnelRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Funnel</h3>
                  </header>

                  {previsioniFunnelRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniFunnelRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th>BU</th>
                            <th>Tipo</th>
                            <th>Stato Documento</th>
                            <th>Commessa</th>
                            <th>Protocollo</th>
                            <th>Data</th>
                            <th>Oggetto</th>
                            <th className="num">% Successo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Personale</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Ricavo atteso</th>
                            <th className="num">Fatturato emesso</th>
                            <th className="num">Fatturato futuro</th>
                            <th className="num">Totale anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniFunnelRows.map((row, index) => (
                            <tr key={`previsioni-funnel-${row.anno}-${row.rcc}-${row.protocollo}-${index}`}>
                              <td>{row.anno}</td>
                              <td>{row.rcc}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.tipo}</td>
                              <td>{row.statoDocumento}</td>
                              <td>{row.commessa}</td>
                              <td>{row.protocollo}</td>
                              <td>{formatDate(row.data)}</td>
                              <td>{row.oggetto}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeSuccesso) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeSuccesso)}
                              </td>
                              <td className={`num ${row.budgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetRicavo)}</td>
                              <td className={`num ${row.budgetPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPersonale)}</td>
                              <td className={`num ${row.budgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetCosti)}</td>
                              <td className={`num ${row.ricavoAtteso < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoAtteso)}</td>
                              <td className={`num ${row.fatturatoEmesso < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoEmesso)}</td>
                              <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                              <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-totals-row">
                            <td colSpan={9} className="table-totals-label">Totale</td>
                            <td className={`num ${isAnalisiRccPercentUnderTarget(previsioniFunnelTotals.percentualeSuccesso) ? 'num-under-target' : ''}`}>
                              {formatAnalisiRccPercent(previsioniFunnelTotals.percentualeSuccesso)}
                            </td>
                            <td className={`num ${previsioniFunnelTotals.budgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetRicavo)}</td>
                            <td className={`num ${previsioniFunnelTotals.budgetPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetPersonale)}</td>
                            <td className={`num ${previsioniFunnelTotals.budgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetCosti)}</td>
                            <td className={`num ${previsioniFunnelTotals.ricavoAtteso < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.ricavoAtteso)}</td>
                            <td className={`num ${previsioniFunnelTotals.fatturatoEmesso < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.fatturatoEmesso)}</td>
                            <td className={`num ${previsioniFunnelTotals.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.fatturatoFuturo)}</td>
                            <td className={`num ${previsioniFunnelTotals.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.totaleAnno)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>

  )
}
