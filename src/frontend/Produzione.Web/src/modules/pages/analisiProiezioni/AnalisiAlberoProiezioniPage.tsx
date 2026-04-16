// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AnalisiAlberoProiezioniPageProps = any

export function AnalisiAlberoProiezioniPage(props: AnalisiAlberoProiezioniPageProps) {
  const {
    analisiAlberoProiezioniAnno,
    analisiAlberoProiezioniAnnoOptions,
    analisiAlberoProiezioniBusinessUnit,
    analisiAlberoProiezioniBusinessUnitOptions,
    analisiAlberoProiezioniData,
    analisiAlberoProiezioniRcc,
    analisiAlberoProiezioniRccOptions,
    analisiAlberoProiezioniRows,
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessAnalisiAlberoProiezioniPage,
    canExportAnalisiPage,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    resetAnalisiFilters,
    setAnalisiAlberoProiezioniAnno,
    setAnalisiAlberoProiezioniBusinessUnit,
    setAnalisiAlberoProiezioniRcc,
    toggleAnalisiSearchCollapsed,
  } = props as any

  const rowClassName = (row: any) => {
    if (row.livello === 0) {
      return 'albero-proiezioni-row level-0'
    }
    if (row.livello === 1) {
      return 'albero-proiezioni-row level-1'
    }
    if (row.livello === 2) {
      return 'albero-proiezioni-row level-2'
    }
    if (row.livello === 3) {
      return 'albero-proiezioni-row level-3'
    }
    return 'albero-proiezioni-row level-4'
  }

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Proiezioni - Albero Proiezioni</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      {!canAccessAnalisiAlberoProiezioniPage && (
        <p className="empty-state">
          Il profilo corrente non e' abilitato a questa analisi.
        </p>
      )}

      {canAccessAnalisiAlberoProiezioniPage && (
        <>
          <section className="panel sintesi-filter-panel">
            <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
              <label className="analisi-rcc-year-field" htmlFor="analisi-albero-proiezioni-anno">
                <span>Anno</span>
                <select
                  id="analisi-albero-proiezioni-anno"
                  value={analisiAlberoProiezioniAnno}
                  onChange={(event) => setAnalisiAlberoProiezioniAnno(event.target.value)}
                >
                  {analisiAlberoProiezioniAnnoOptions.map((year) => (
                    <option key={`analisi-albero-proiezioni-anno-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analisi-rcc-year-field" htmlFor="analisi-albero-proiezioni-rcc">
                <span>RCC</span>
                <select
                  id="analisi-albero-proiezioni-rcc"
                  value={analisiAlberoProiezioniRcc}
                  onChange={(event) => setAnalisiAlberoProiezioniRcc(event.target.value)}
                >
                  <option value="">Tutti</option>
                  {analisiAlberoProiezioniRccOptions.map((value) => (
                    <option key={`analisi-albero-proiezioni-rcc-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analisi-rcc-year-field" htmlFor="analisi-albero-proiezioni-bu">
                <span>BU</span>
                <select
                  id="analisi-albero-proiezioni-bu"
                  value={analisiAlberoProiezioniBusinessUnit}
                  onChange={(event) => setAnalisiAlberoProiezioniBusinessUnit(event.target.value)}
                >
                  <option value="">Tutte</option>
                  {analisiAlberoProiezioniBusinessUnitOptions.map((value) => (
                    <option key={`analisi-albero-proiezioni-bu-${value}`} value={value}>
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
          </section>

          <section className="panel analisi-rcc-grid-card">
            <header className="panel-header">
              <h3>Albero Proiezioni</h3>
            </header>

            {analisiAlberoProiezioniRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}

            {analisiAlberoProiezioniRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>RCC</th>
                      <th>BU</th>
                      <th>Cliente</th>
                      <th>Commessa</th>
                      <th className="num">Fatturato</th>
                      <th className="num">Fatturato futuro</th>
                      <th className="num">Totale</th>
                      <th className="num">Ricavo ipotetico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisiAlberoProiezioniRows.map((row) => (
                      <tr key={row.key} className={rowClassName(row)}>
                        <td>{row.livello === 0 ? row.anno : ''}</td>
                        <td>{row.livello === 1 ? row.rcc : ''}</td>
                        <td>{row.livello === 2 ? row.businessUnit : ''}</td>
                        <td>{row.livello === 3 ? row.cliente : ''}</td>
                        <td>{row.livello === 4 ? row.commessa : ''}</td>
                        <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                        <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                        <td className={`num ${row.totale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale)}</td>
                        <td className={`num ${row.ricavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoIpotetico)}</td>
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
