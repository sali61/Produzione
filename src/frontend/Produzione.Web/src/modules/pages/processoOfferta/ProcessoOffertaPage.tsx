// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type ProcessoOffertaPageProps = any

export function ProcessoOffertaPage(props: ProcessoOffertaPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canAccessProcessoOffertaPage,
    canExportAnalisiPage,
    currentProfile,
    exportAnalisiExcel,
    formatDate,
    formatNumber,
    formatPercentRatio,
    formatPercentValue,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    isProcessoOffertaIncidenzaBuPage,
    isProcessoOffertaIncidenzaRccPage,
    isProcessoOffertaOffertePage,
    isProcessoOffertaPercentualeSuccessoBuPage,
    isProcessoOffertaPercentualeSuccessoRccPage,
    isProcessoOffertaSintesiBuPage,
    isProcessoOffertaSintesiRccPage,
    openCommessaDetail,
    processoOffertaAggregazioneLabel,
    processoOffertaAnni,
    processoOffertaAnnoOptions,
    processoOffertaCountLabel,
    processoOffertaCurrentData,
    processoOffertaEsiti,
    processoOffertaEsitiOptions,
    processoOffertaIncidenzaRows,
    processoOffertaIncidenzaTotaliPerAnno,
    processoOffertaOfferteRows,
    processoOffertaOfferteTotals,
    processoOffertaPercentualeAggregazioneOptions,
    processoOffertaPercentualeSelectedAggregazione,
    processoOffertaSintesiRicaricoTotale,
    processoOffertaSintesiRows,
    processoOffertaSintesiTotals,
    processoOffertaSuccessoRows,
    processoOffertaSuccessoSintesiRows,
    processoOffertaSuccessoSintesiTotale,
    processoOffertaSuccessoTotale,
    processoOffertaSuccessoTotaleNegativo,
    processoOffertaSuccessoTotaleNonDefinito,
    processoOffertaSuccessoTotalePositivo,
    processoOffertaSuccessoTotaliPerAnno,
    processoOffertaTitle,
    processoOffertaVisibilityMessage,
    resetAnalisiFilters,
    setProcessoOffertaAnni,
    setProcessoOffertaEsiti,
    setProcessoOffertaPercentualeBu,
    setProcessoOffertaPercentualeRcc,
    toggleAnalisiSearchCollapsed,
  } = props as any

  return (
  <section className="panel sintesi-page analisi-rcc-page">
    <header className="panel-header">
      <h2>{processoOffertaTitle}</h2>
      <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
    </header>

    {!canAccessProcessoOffertaPage && (
      <p className="empty-state">
        Il profilo corrente non e' abilitato a Processo Offerta.
      </p>
    )}

    {canAccessProcessoOffertaPage && (
      <>
        <section className="panel sintesi-filter-panel">
          <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
            <label className="analisi-rcc-year-field" htmlFor="processo-offerta-anni">
              <span>Anni</span>
              <select
                id="processo-offerta-anni"
                multiple
                size={4}
                value={processoOffertaAnni}
                onChange={(event) => setProcessoOffertaAnni(
                  Array.from(event.target.selectedOptions).map((option) => option.value),
                )}
              >
                {processoOffertaAnnoOptions.map((year) => (
                  <option key={`processo-offerta-anno-${year}`} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            {(isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage)
              ? (
                <label className="analisi-rcc-year-field" htmlFor="processo-offerta-percentuale-aggregazione">
                  <span>{processoOffertaAggregazioneLabel}</span>
                  <select
                    id="processo-offerta-percentuale-aggregazione"
                    value={processoOffertaPercentualeSelectedAggregazione}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      if (isProcessoOffertaPercentualeSuccessoRccPage) {
                        setProcessoOffertaPercentualeRcc(nextValue)
                      } else {
                        setProcessoOffertaPercentualeBu(nextValue)
                      }
                    }}
                  >
                    <option value="">Tutti</option>
                    {processoOffertaPercentualeAggregazioneOptions.map((value) => (
                      <option key={`processo-offerta-aggregazione-${value}`} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )
              : (
                <label className="analisi-rcc-year-field" htmlFor="processo-offerta-esiti">
                  <span>Esito</span>
                  <select
                    id="processo-offerta-esiti"
                    multiple
                    size={Math.max(3, Math.min(6, processoOffertaEsitiOptions.length || 3))}
                    value={processoOffertaEsiti}
                    onChange={(event) => setProcessoOffertaEsiti(
                      Array.from(event.target.selectedOptions).map((option) => option.value),
                    )}
                  >
                    {processoOffertaEsitiOptions.map((value) => (
                      <option key={`processo-offerta-esito-${value}`} value={value}>
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
              {processoOffertaCurrentData
                ? `Anni ${processoOffertaCurrentData.anni.join(', ') || '-'}, ${processoOffertaVisibilityMessage}.`
                : processoOffertaVisibilityMessage}
            </p>
            <span className="status-badge neutral">{processoOffertaCountLabel}</span>
          </div>
        </section>

        {isProcessoOffertaOffertePage && (
          <section className="panel analisi-rcc-grid-card">
            <header className="panel-header">
              <h3>Offerte</h3>
            </header>
            {processoOffertaOfferteRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}
            {processoOffertaOfferteRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>Data</th>
                      <th>Business Unit</th>
                      <th>RCC</th>
                      <th>Commessa</th>
                      <th>Protocollo</th>
                      <th>Tipo</th>
                      <th>Stato Documento</th>
                      <th>Esito</th>
                      <th>Esito Positivo</th>
                      <th>Oggetto</th>
                      <th>Controparte</th>
                      <th className="num">% Successo</th>
                      <th className="num">Importo Prevedibile</th>
                      <th className="num">Costo Prevedibile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processoOffertaOfferteRows.map((row) => (
                      <tr key={`processo-offerta-offerta-${row.id}`}>
                        <td>{row.anno}</td>
                        <td>{formatDate(row.data)}</td>
                        <td>{row.businessUnit}</td>
                        <td>{row.rcc}</td>
                        <td>
                          {row.commessa.trim()
                            ? (
                              <button
                                type="button"
                                className="inline-link-button"
                                onClick={() => openCommessaDetail(row.commessa)}
                                title={`Apri dettaglio commessa ${row.commessa}`}
                              >
                                {row.commessa}
                              </button>
                            )
                            : ''}
                        </td>
                        <td>{row.protocollo}</td>
                        <td>{row.tipo}</td>
                        <td>{row.statoDocumento}</td>
                        <td>{row.esito}</td>
                        <td>{row.esitoPositivoTesto}</td>
                        <td>{row.oggetto}</td>
                        <td>{row.controparte}</td>
                        <td className="num">{formatPercentValue(row.percentualeSuccesso)}</td>
                        <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                        <td className={`num ${row.costoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevedibile)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-totals-row">
                      <td colSpan={13} className="table-totals-label">Totale</td>
                      <td className={`num ${processoOffertaOfferteTotals.importoPrevedibile < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(processoOffertaOfferteTotals.importoPrevedibile)}
                      </td>
                      <td className={`num ${processoOffertaOfferteTotals.costoPrevedibile < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(processoOffertaOfferteTotals.costoPrevedibile)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        )}

        {(isProcessoOffertaSintesiRccPage || isProcessoOffertaSintesiBuPage) && (
          <section className="panel analisi-rcc-grid-card">
            <header className="panel-header">
              <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Sintesi RCC' : 'Sintesi BU'}</h3>
            </header>
            {processoOffertaSintesiRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}
            {processoOffertaSintesiRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th>Anno</th>
                      <th>{processoOffertaAggregazioneLabel}</th>
                      <th>Tipo</th>
                      <th>Esito Positivo</th>
                      <th className="num">Numero</th>
                      <th className="num">Importo Prevedibile</th>
                      <th className="num">Costo Prevedibile</th>
                      <th className="num">% Ricarico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processoOffertaSintesiRows.map((row, index) => (
                      <tr key={`processo-offerta-sintesi-${row.anno}-${row.aggregazione}-${row.tipo}-${row.esitoPositivoTesto}-${index}`}>
                        <td>{row.anno}</td>
                        <td>{row.aggregazione}</td>
                        <td>{row.tipo}</td>
                        <td>{row.esitoPositivoTesto}</td>
                        <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                        <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                        <td className={`num ${row.costoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevedibile)}</td>
                        <td className="num">{formatPercentValue(row.percentualeRicarico)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-totals-row">
                      <td colSpan={4} className="table-totals-label">Totale</td>
                      <td className="num">{processoOffertaSintesiTotals.numero.toLocaleString('it-IT')}</td>
                      <td className={`num ${processoOffertaSintesiTotals.importoPrevedibile < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(processoOffertaSintesiTotals.importoPrevedibile)}
                      </td>
                      <td className={`num ${processoOffertaSintesiTotals.costoPrevedibile < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(processoOffertaSintesiTotals.costoPrevedibile)}
                      </td>
                      <td className="num">{formatPercentValue(processoOffertaSintesiRicaricoTotale)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        )}

        {(isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage) && (
          <>
            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Percentuale Successo RCC' : 'Percentuale Successo BU'}</h3>
              </header>
              {processoOffertaSuccessoRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}
            {processoOffertaSuccessoRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Anno</th>
                      <th rowSpan={2}>{processoOffertaAggregazioneLabel}</th>
                      <th colSpan={4}>Negativo</th>
                      <th colSpan={4}>Non definito</th>
                      <th colSpan={4}>Positivo</th>
                      <th colSpan={4}>Totale</th>
                    </tr>
                    <tr>
                      <th className="num">Ricavo in Offerta</th>
                      <th className="num">Costo in Offerta</th>
                      <th className="num">Margine Operativo</th>
                      <th className="num">Ricarico %</th>
                      <th className="num">Ricavo in Offerta</th>
                      <th className="num">Costo in Offerta</th>
                      <th className="num">Margine Operativo</th>
                      <th className="num">Ricarico %</th>
                      <th className="num">Ricavo in Offerta</th>
                      <th className="num">Costo in Offerta</th>
                      <th className="num">Margine Operativo</th>
                      <th className="num">Ricarico %</th>
                      <th className="num">Ricavo in Offerta</th>
                      <th className="num">Costo in Offerta</th>
                      <th className="num">Margine Operativo</th>
                      <th className="num">Ricarico % totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processoOffertaSuccessoRows.map((row) => (
                      <tr key={`processo-offerta-successo-${row.anno}-${row.aggregazione}`}>
                        <td>{row.anno}</td>
                        <td>{row.aggregazione}</td>
                        <td className={`num ${row.negativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.ricavo)}</td>
                        <td className={`num ${row.negativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.costo)}</td>
                        <td className={`num ${row.negativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.margine)}</td>
                        <td className="num">{formatPercentValue(row.negativo.ricarico)}</td>
                        <td className={`num ${row.nonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.ricavo)}</td>
                        <td className={`num ${row.nonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.costo)}</td>
                        <td className={`num ${row.nonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.margine)}</td>
                        <td className="num">{formatPercentValue(row.nonDefinito.ricarico)}</td>
                        <td className={`num ${row.positivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.ricavo)}</td>
                        <td className={`num ${row.positivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.costo)}</td>
                        <td className={`num ${row.positivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.margine)}</td>
                        <td className="num">{formatPercentValue(row.positivo.ricarico)}</td>
                        <td className={`num ${row.totale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.ricavo)}</td>
                        <td className={`num ${row.totale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.costo)}</td>
                        <td className={`num ${row.totale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.margine)}</td>
                        <td className="num">{formatPercentValue(row.totale.ricarico)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-totals-row">
                      <td colSpan={2} className="table-totals-label">Totale complessivo</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNegativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.ricavo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNegativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.costo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNegativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.margine)}</td>
                      <td className="num">{formatPercentValue(processoOffertaSuccessoTotaleNegativo.ricarico)}</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.ricavo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.costo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.margine)}</td>
                      <td className="num">{formatPercentValue(processoOffertaSuccessoTotaleNonDefinito.ricarico)}</td>
                      <td className={`num ${processoOffertaSuccessoTotalePositivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.ricavo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotalePositivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.costo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotalePositivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.margine)}</td>
                      <td className="num">{formatPercentValue(processoOffertaSuccessoTotalePositivo.ricarico)}</td>
                      <td className={`num ${processoOffertaSuccessoTotale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.ricavo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.costo)}</td>
                      <td className={`num ${processoOffertaSuccessoTotale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.margine)}</td>
                      <td className="num">{formatPercentValue(processoOffertaSuccessoTotale.ricarico)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="panel analisi-rcc-grid-card">
            <header className="panel-header">
              <h3>Sintesi successo ({processoOffertaAggregazioneLabel})</h3>
            </header>
            {processoOffertaSuccessoSintesiRows.length === 0 && !analisiRccLoading && (
              <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
            )}
            {processoOffertaSuccessoSintesiRows.length > 0 && (
              <div className="bonifici-table-wrap bonifici-table-wrap-main">
                <table className="bonifici-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Anno</th>
                      <th rowSpan={2}>{processoOffertaAggregazioneLabel}</th>
                      <th colSpan={4}>Negativo</th>
                      <th colSpan={4}>Non definito</th>
                      <th colSpan={4}>Positivo</th>
                      <th colSpan={2}>Totale</th>
                    </tr>
                    <tr>
                      <th className="num">N Offerte</th>
                      <th className="num">Importo</th>
                      <th className="num">% Numero</th>
                      <th className="num">% Importo</th>
                      <th className="num">N Offerte</th>
                      <th className="num">Importo</th>
                      <th className="num">% Numero</th>
                      <th className="num">% Importo</th>
                      <th className="num">N Offerte</th>
                      <th className="num">Importo</th>
                      <th className="num">% Numero</th>
                      <th className="num">% Importo</th>
                      <th className="num">N Offerte</th>
                      <th className="num">Importo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processoOffertaSuccessoSintesiRows.map((row) => (
                      <tr key={`processo-offerta-successo-sintesi-${row.anno}-${row.aggregazione}`}>
                        <td>{row.anno}</td>
                        <td>{row.aggregazione}</td>
                        <td className="num">{row.negativo.numero.toLocaleString('it-IT')}</td>
                        <td className={`num ${row.negativo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.importo)}</td>
                        <td className="num">{formatPercentRatio(row.negativo.percentualeNumero)}</td>
                        <td className="num">{formatPercentRatio(row.negativo.percentualeImporto)}</td>
                        <td className="num">{row.nonDefinito.numero.toLocaleString('it-IT')}</td>
                        <td className={`num ${row.nonDefinito.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.importo)}</td>
                        <td className="num">{formatPercentRatio(row.nonDefinito.percentualeNumero)}</td>
                        <td className="num">{formatPercentRatio(row.nonDefinito.percentualeImporto)}</td>
                        <td className="num">{row.positivo.numero.toLocaleString('it-IT')}</td>
                        <td className={`num ${row.positivo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.importo)}</td>
                        <td className="num">{formatPercentRatio(row.positivo.percentualeNumero)}</td>
                        <td className="num">{formatPercentRatio(row.positivo.percentualeImporto)}</td>
                        <td className="num">{row.totaleNumero.toLocaleString('it-IT')}</td>
                        <td className={`num ${row.totaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleImporto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-totals-row">
                      <td colSpan={2} className="table-totals-label">Totale complessivo</td>
                      <td className="num">{processoOffertaSuccessoSintesiTotale.negativo.numero.toLocaleString('it-IT')}</td>
                      <td className={`num ${processoOffertaSuccessoSintesiTotale.negativo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.negativo.importo)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.negativo.percentualeNumero)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.negativo.percentualeImporto)}</td>
                      <td className="num">{processoOffertaSuccessoSintesiTotale.nonDefinito.numero.toLocaleString('it-IT')}</td>
                      <td className={`num ${processoOffertaSuccessoSintesiTotale.nonDefinito.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.nonDefinito.importo)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.nonDefinito.percentualeNumero)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.nonDefinito.percentualeImporto)}</td>
                      <td className="num">{processoOffertaSuccessoSintesiTotale.positivo.numero.toLocaleString('it-IT')}</td>
                      <td className={`num ${processoOffertaSuccessoSintesiTotale.positivo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.positivo.importo)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.positivo.percentualeNumero)}</td>
                      <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.positivo.percentualeImporto)}</td>
                      <td className="num">{processoOffertaSuccessoSintesiTotale.totaleNumero.toLocaleString('it-IT')}</td>
                      <td className={`num ${processoOffertaSuccessoSintesiTotale.totaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.totaleImporto)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>Totali per anno</h3>
              </header>
              {processoOffertaSuccessoTotaliPerAnno.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
              )}
              {processoOffertaSuccessoTotaliPerAnno.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>Anno</th>
                        <th colSpan={4}>Negativo</th>
                        <th colSpan={4}>Non definito</th>
                        <th colSpan={4}>Positivo</th>
                        <th colSpan={4}>Totale</th>
                      </tr>
                      <tr>
                        <th className="num">Ricavo in Offerta</th>
                        <th className="num">Costo in Offerta</th>
                        <th className="num">Margine Operativo</th>
                        <th className="num">Ricarico %</th>
                        <th className="num">Ricavo in Offerta</th>
                        <th className="num">Costo in Offerta</th>
                        <th className="num">Margine Operativo</th>
                        <th className="num">Ricarico %</th>
                        <th className="num">Ricavo in Offerta</th>
                        <th className="num">Costo in Offerta</th>
                        <th className="num">Margine Operativo</th>
                        <th className="num">Ricarico %</th>
                        <th className="num">Ricavo in Offerta</th>
                        <th className="num">Costo in Offerta</th>
                        <th className="num">Margine Operativo</th>
                        <th className="num">Ricarico % totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processoOffertaSuccessoTotaliPerAnno.map((row) => (
                        <tr key={`processo-offerta-successo-totale-${row.anno}`} className="table-totals-row">
                          <td>{row.anno}</td>
                          <td className={`num ${row.negativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.ricavo)}</td>
                          <td className={`num ${row.negativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.costo)}</td>
                          <td className={`num ${row.negativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.margine)}</td>
                          <td className="num">{formatPercentValue(row.negativo.ricarico)}</td>
                          <td className={`num ${row.nonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.ricavo)}</td>
                          <td className={`num ${row.nonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.costo)}</td>
                          <td className={`num ${row.nonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.margine)}</td>
                          <td className="num">{formatPercentValue(row.nonDefinito.ricarico)}</td>
                          <td className={`num ${row.positivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.ricavo)}</td>
                          <td className={`num ${row.positivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.costo)}</td>
                          <td className={`num ${row.positivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.margine)}</td>
                          <td className="num">{formatPercentValue(row.positivo.ricarico)}</td>
                          <td className={`num ${row.totale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.ricavo)}</td>
                          <td className={`num ${row.totale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.costo)}</td>
                          <td className={`num ${row.totale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.margine)}</td>
                          <td className="num">{formatPercentValue(row.totale.ricarico)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {(isProcessoOffertaIncidenzaRccPage || isProcessoOffertaIncidenzaBuPage) && (
          <>
            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Incidenza RCC su totale anno' : 'Incidenza BU su totale anno'}</h3>
              </header>
              {processoOffertaIncidenzaRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}
              {processoOffertaIncidenzaRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>Anno</th>
                        <th>{processoOffertaAggregazioneLabel}</th>
                        <th className="num">Numero</th>
                        <th className="num">Importo Prevedibile</th>
                        <th className="num">Totale anno</th>
                        <th className="num">% su totale anno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processoOffertaIncidenzaRows.map((row) => (
                        <tr key={`processo-offerta-incidenza-${row.anno}-${row.aggregazione}`}>
                          <td>{row.anno}</td>
                          <td>{row.aggregazione}</td>
                          <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                          <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                          <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                          <td className="num">{formatPercentRatio(row.percentualeSuAnno)}</td>
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
              {processoOffertaIncidenzaTotaliPerAnno.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
              )}
              {processoOffertaIncidenzaTotaliPerAnno.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>Anno</th>
                        <th className="num">Numero</th>
                        <th className="num">Importo Prevedibile</th>
                        <th className="num">Totale anno</th>
                        <th className="num">% su totale anno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processoOffertaIncidenzaTotaliPerAnno.map((row) => (
                        <tr key={`processo-offerta-incidenza-totale-${row.anno}`} className="table-totals-row">
                          <td>{row.anno}</td>
                          <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                          <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                          <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                          <td className="num">{formatPercentRatio(row.percentualeSuAnno)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </>
    )}
  </section>

  )
}
