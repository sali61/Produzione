// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type CommesseAndamentoMensilePageProps = any

export function CommesseAndamentoMensilePage(props: CommesseAndamentoMensilePageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canExportAnalisiPage,
    commesseAndamentoMensileAggrega,
    commesseAndamentoMensileAnni,
    commesseAndamentoMensileAnnoOptions,
    commesseAndamentoMensileBusinessUnit,
    commesseAndamentoMensileBusinessUnitOptions,
    commesseAndamentoMensileCommessa,
    commesseAndamentoMensileCommessaOptions,
    commesseAndamentoMensileCommessaSearch,
    commesseAndamentoMensileControparte,
    commesseAndamentoMensileControparteOptions,
    commesseAndamentoMensileData,
    commesseAndamentoMensileMacroTipologia,
    commesseAndamentoMensileMacroTipologiaOptions,
    commesseAndamentoMensileMese,
    commesseAndamentoMensileMeseOptions,
    commesseAndamentoMensilePm,
    commesseAndamentoMensilePmSelectItems,
    commesseAndamentoMensileRcc,
    commesseAndamentoMensileRccSelectItems,
    commesseAndamentoMensileRows,
    commesseAndamentoMensileStato,
    commesseAndamentoMensileStatoOptions,
    commesseAndamentoMensileTipologia,
    commesseAndamentoMensileTipologiaOptions,
    commesseAndamentoMensileTotals,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    formatReferenceMonthLabel,
    getDefaultReferenceMonth,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    openCommessaDetail,
    parseReferenceMonthStrict,
    resetAnalisiFilters,
    setCommesseAndamentoMensileAggrega,
    setCommesseAndamentoMensileAnni,
    setCommesseAndamentoMensileBusinessUnit,
    setCommesseAndamentoMensileCommessa,
    setCommesseAndamentoMensileCommessaSearch,
    setCommesseAndamentoMensileControparte,
    setCommesseAndamentoMensileMacroTipologia,
    setCommesseAndamentoMensileMese,
    setCommesseAndamentoMensilePm,
    setCommesseAndamentoMensileRcc,
    setCommesseAndamentoMensileStato,
    setCommesseAndamentoMensileTipologia,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed,
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Andamento Mensile</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form
                className={`sintesi-form ${analisiRccLoading ? 'is-filter-loading' : ''}`}
                onSubmit={handleAnalisiSubmit}
                aria-busy={analisiRccLoading}
              >
                {(!isAnalisiSearchCollapsible || !isAnalisiSearchCollapsed) && (
                  <div className="sintesi-filters-grid andamento-mensile-filters-grid">
                    <div className="sintesi-field sintesi-field-anni">
                      <label htmlFor="commesse-andamento-mensile-anni">Anni</label>
                      <select
                        id="commesse-andamento-mensile-anni"
                        multiple
                        size={2}
                        value={commesseAndamentoMensileAnni}
                        onChange={(event) => setCommesseAndamentoMensileAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {commesseAndamentoMensileAnnoOptions.map((year) => (
                          <option key={`commesse-andamento-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-commessa-search">Ricerca Commessa</label>
                      <div className="commessa-inline-controls">
                        <input
                          id="commesse-andamento-mensile-commessa-search"
                          type="search"
                          placeholder="Cerca..."
                          value={commesseAndamentoMensileCommessaSearch}
                          onChange={(event) => setCommesseAndamentoMensileCommessaSearch(event.target.value)}
                        />
                        <select
                          id="commesse-andamento-mensile-commessa"
                          value={commesseAndamentoMensileCommessa}
                          onChange={(event) => setCommesseAndamentoMensileCommessa(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {commesseAndamentoMensileCommessaOptions.map((option) => (
                            <option key={`commesse-andamento-commessa-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-tipologia">Tipologia Commessa</label>
                      <select
                        id="commesse-andamento-mensile-tipologia"
                        value={commesseAndamentoMensileTipologia}
                        onChange={(event) => setCommesseAndamentoMensileTipologia(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseAndamentoMensileTipologiaOptions.map((value) => (
                          <option key={`commesse-andamento-tipologia-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-stato">Stato</label>
                      <select
                        id="commesse-andamento-mensile-stato"
                        value={commesseAndamentoMensileStato}
                        onChange={(event) => setCommesseAndamentoMensileStato(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {commesseAndamentoMensileStatoOptions.map((value) => (
                          <option key={`commesse-andamento-stato-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-macro">Macrotipologia</label>
                      <select
                        id="commesse-andamento-mensile-macro"
                        value={commesseAndamentoMensileMacroTipologia}
                        onChange={(event) => setCommesseAndamentoMensileMacroTipologia(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseAndamentoMensileMacroTipologiaOptions.map((value) => (
                          <option key={`commesse-andamento-macro-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-bu">Business Unit</label>
                      <select
                        id="commesse-andamento-mensile-bu"
                        value={commesseAndamentoMensileBusinessUnit}
                        onChange={(event) => setCommesseAndamentoMensileBusinessUnit(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseAndamentoMensileBusinessUnitOptions.map((value) => (
                          <option key={`commesse-andamento-bu-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-controparte">Controparte</label>
                      <select
                        id="commesse-andamento-mensile-controparte"
                        value={commesseAndamentoMensileControparte}
                        onChange={(event) => setCommesseAndamentoMensileControparte(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseAndamentoMensileControparteOptions.map((value) => (
                          <option key={`commesse-andamento-controparte-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-rcc">RCC</label>
                      <select
                        id="commesse-andamento-mensile-rcc"
                        value={commesseAndamentoMensileRcc}
                        onChange={(event) => setCommesseAndamentoMensileRcc(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {commesseAndamentoMensileRccSelectItems.map((option) => (
                          <option key={`commesse-andamento-rcc-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sintesi-field">
                      <label htmlFor="commesse-andamento-mensile-pm">PM</label>
                      <select
                        id="commesse-andamento-mensile-pm"
                        value={commesseAndamentoMensilePm}
                        onChange={(event) => setCommesseAndamentoMensilePm(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {commesseAndamentoMensilePmSelectItems.map((option) => (
                          <option key={`commesse-andamento-pm-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="inline-actions">
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
                  <label className="checkbox-label checkbox-label-inline analisi-aggrega-inline" htmlFor="commesse-andamento-mensile-aggrega">
                    <input
                      id="commesse-andamento-mensile-aggrega"
                      type="checkbox"
                      checked={commesseAndamentoMensileAggrega}
                      onChange={(event) => setCommesseAndamentoMensileAggrega(event.target.checked)}
                    />
                    Aggrega fino a
                  </label>
                  <label className="analisi-aggrega-mese-inline" htmlFor="commesse-andamento-mensile-mese">
                    <span>Mese</span>
                    <select
                      id="commesse-andamento-mensile-mese"
                      value={(parseReferenceMonthStrict(commesseAndamentoMensileMese) ?? getDefaultReferenceMonth()).toString()}
                      disabled={!commesseAndamentoMensileAggrega}
                      onChange={(event) => setCommesseAndamentoMensileMese(event.target.value)}
                    >
                      {commesseAndamentoMensileMeseOptions.map((month) => (
                        <option key={`commesse-andamento-mese-${month}`} value={month.toString()}>
                          {formatReferenceMonthLabel(month)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="status-badge neutral sintesi-inline-count-badge">
                    {analisiPageCountLabel}
                  </span>
                </div>
              </form>
              <div className="sintesi-toolbar-row">
                <p className="sintesi-toolbar-message">
                  {commesseAndamentoMensileData
                    ? `Andamento mensile ${commesseAndamentoMensileAggrega ? 'aggregato fino a' : 'dettaglio mensile'} caricato (${commesseAndamentoMensileAnni.join(', ') || '-'}${commesseAndamentoMensileAggrega ? `, mese: ${(parseReferenceMonthStrict(commesseAndamentoMensileMese) ?? getDefaultReferenceMonth()).toString().padStart(2, '0')}` : ''}).`
                    : statusMessageVisible}
                </p>
              </div>
            </section>

            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>AnalisiCommesseMensili</h3>
              </header>

              {commesseAndamentoMensileRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}

              {commesseAndamentoMensileRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>Anno</th>
                        <th>Mese</th>
                        <th>Commessa</th>
                        <th>Descrizione</th>
                        <th>Tipologia</th>
                        <th>Stato</th>
                        <th>Macrotipologia</th>
                        <th>Prodotto</th>
                        <th>Controparte</th>
                        <th>BU</th>
                        <th>RCC</th>
                        <th>PM</th>
                        <th>Produzione</th>
                        <th className="num">Ore Lavorate</th>
                        <th className="num">Costo Personale</th>
                        <th className="num">Ricavi</th>
                        <th className="num">Costi</th>
                        <th className="num">Ricavi Maturati</th>
                        <th className="num">Utile Specifico</th>
                        <th className="num">Ore Future</th>
                        <th className="num">Costo Personale Futuro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commesseAndamentoMensileRows.map((row, index) => (
                        <tr key={`commesse-andamento-row-${row.annoCompetenza}-${row.meseCompetenza}-${row.commessa}-${index}`}>
                          <td>{row.annoCompetenza}</td>
                          <td>{row.meseCompetenza > 0 ? row.meseCompetenza.toString().padStart(2, '0') : '-'}</td>
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
                          <td>{row.descrizioneCommessa}</td>
                          <td>{row.tipologiaCommessa}</td>
                          <td>{row.stato}</td>
                          <td>{row.macroTipologia}</td>
                          <td>{row.prodotto}</td>
                          <td>{row.controparte}</td>
                          <td>{row.businessUnit}</td>
                          <td>{row.rcc}</td>
                          <td>{row.pm}</td>
                          <td>{row.produzione ? 'Si' : 'No'}</td>
                          <td className="num">{formatNumber(row.oreLavorate)}</td>
                          <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                          <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                          <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          <td className={`num ${row.ricaviMaturati < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviMaturati)}</td>
                          <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                          <td className={`num ${row.oreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(row.oreFuture)}</td>
                          <td className={`num ${row.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonaleFuturo)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-totals-row">
                        <td colSpan={13} className="table-totals-label">Totale</td>
                        <td className="num">{formatNumber(commesseAndamentoMensileTotals.oreLavorate)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costoPersonale)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.ricavi)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costi)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.ricaviMaturati < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.ricaviMaturati)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.utileSpecifico)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.oreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.oreFuture)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costoPersonaleFuturo)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </section>

  )
}
