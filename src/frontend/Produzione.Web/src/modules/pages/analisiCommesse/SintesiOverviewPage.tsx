// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type SintesiOverviewPageProps = any

export function SintesiOverviewPage(props: SintesiOverviewPageProps) {
  const {
    annoOptions,
    areAllProductsCollapsed,
    attiveDalAnnoOptions,
    calculateUtileFineProgetto,
    collapseAllProducts,
    commessaOptions,
    commessaSearch,
    currentProfile,
    datiContabiliAcquistoSearched,
    datiContabiliAcquistoSortedRows,
    datiContabiliCountLabel,
    datiContabiliLoading,
    datiContabiliProvenienzaOptions,
    datiContabiliVenditaSearched,
    datiContabiliVenditaSortedRows,
    expandAllProducts,
    exportSintesiExcel,
    formatDate,
    formatNumber,
    handleSintesiSubmit,
    hasCollapsedProducts,
    hasProductGroups,
    isAggregatedMode,
    isDatiContabiliAcquistiPage,
    isDatiContabiliPage,
    isDatiContabiliVenditaPage,
    isProdottiSintesiPage,
    isSintesiFiltersCollapsible,
    openCommessaDetail,
    productOrCounterpartColumn,
    productOrCounterpartLabel,
    refreshSintesiFilters,
    resetSintesi,
    sessionLoading,
    setCommessaSearch,
    setSintesiFiltersCollapsed,
    setSintesiFiltersForm,
    setSintesiMode,
    shouldShowUtileFineProgettoForRow,
    showUtileFineProgettoColumn,
    sintesiCountLabel,
    sintesiExportRowsCount,
    sintesiFilterLoadingDetail,
    sintesiFiltersCollapsed,
    sintesiFiltersForm,
    sintesiLoadingData,
    sintesiLoadingFilters,
    sintesiSearched,
    sintesiSelects,
    sintesiTableRows,
    sintesiTitle,
    sortedRows,
    sortIndicator,
    statusMessageVisible,
    toggleProductCollapse,
    toggleSort,
    totaleUtileFineProgettoValorizzato,
    totals,
  } = props as any

  return (
          <section className="panel sintesi-page">
            <header className="panel-header">
              <h2>{sintesiTitle}</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form
                className={`sintesi-form ${sintesiLoadingFilters ? 'is-filter-loading' : ''}`}
                onSubmit={handleSintesiSubmit}
                aria-busy={sintesiLoadingFilters}
              >
                {(!isSintesiFiltersCollapsible || !sintesiFiltersCollapsed) && (
                <div className="sintesi-filters-grid">
                  <div className="sintesi-field sintesi-field-anni">
                    <div className="sintesi-field-header-row">
                      <label htmlFor="sintesi-anni">{isDatiContabiliPage ? 'Anni Fattura' : 'Anni'}</label>
                      {!isDatiContabiliPage && (
                        <label htmlFor="sintesi-aggrega" className="checkbox-label checkbox-label-inline">
                          <input
                            id="sintesi-aggrega"
                            type="checkbox"
                            checked={isAggregatedMode}
                            onChange={(event) => setSintesiMode(event.target.checked ? 'aggregato' : 'dettaglio')}
                          />
                          Aggrega
                        </label>
                      )}
                    </div>
                    <select
                      id="sintesi-anni"
                      multiple
                      size={2}
                      value={sintesiFiltersForm.anni}
                      disabled={sintesiLoadingFilters}
                      onChange={(event) => setSintesiFiltersForm((current) => ({
                        ...current,
                        anni: Array.from(event.target.selectedOptions).map((option) => option.value),
                      }))}
                    >
                      {annoOptions.map((option) => (
                        <option key={`sintesi-anno-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isDatiContabiliPage && (
                    <div className="sintesi-field sintesi-field-attive-dal">
                      <label htmlFor="sintesi-attive-dal-anno">Attive dal</label>
                      <select
                        id="sintesi-attive-dal-anno"
                        value={sintesiFiltersForm.attiveDalAnno}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          attiveDalAnno: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {attiveDalAnnoOptions.map((value) => (
                          <option key={`sintesi-attive-dal-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sintesi-field">
                    <label htmlFor="sintesi-commessa-search">Ricerca Commessa</label>
                    <div className="commessa-inline-controls">
                      <input
                        id="sintesi-commessa-search"
                        value={commessaSearch}
                        onChange={(event) => setCommessaSearch(event.target.value)}
                        placeholder="Cerca..."
                        disabled={sintesiLoadingFilters}
                      />
                      <select
                        id="sintesi-commessa"
                        value={sintesiFiltersForm.commessa}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          commessa: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {commessaOptions.map((option) => (
                          <option key={`sintesi-commessa-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {sintesiSelects.map((selectField) => (
                    <div
                      key={selectField.id}
                      className={[
                        'sintesi-field',
                        selectField.id === 'sintesi-stato' ? 'sintesi-field-stato' : '',
                        selectField.id === 'sintesi-business-unit' ? 'sintesi-field-business-unit' : '',
                        selectField.id === 'sintesi-controparte' ? 'sintesi-field-controparte' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <label htmlFor={selectField.id}>{selectField.label}</label>
                      <select
                        id={selectField.id}
                        value={sintesiFiltersForm[selectField.key]}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          [selectField.key]: event.target.value,
                        }))}
                      >
                        <option value="">Tutti</option>
                        {selectField.options.map((option) => (
                          <option key={`${selectField.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {isDatiContabiliPage && (
                    <div className="sintesi-field">
                      <label htmlFor="sintesi-provenienza">Provenienza</label>
                      <select
                        id="sintesi-provenienza"
                        value={sintesiFiltersForm.provenienza}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          provenienza: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {datiContabiliProvenienzaOptions.map((option) => (
                          <option key={`sintesi-provenienza-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isDatiContabiliPage && (
                    <div className="sintesi-field sintesi-field-checkbox">
                      <label htmlFor="sintesi-solo-scadute" className="checkbox-label checkbox-label-inline">
                        <input
                          id="sintesi-solo-scadute"
                          type="checkbox"
                          checked={sintesiFiltersForm.soloScadute}
                          onChange={(event) => setSintesiFiltersForm((current) => ({
                            ...current,
                            soloScadute: event.target.checked,
                          }))}
                        />
                        Solo scadute
                      </label>
                    </div>
                  )}

                  {!isProdottiSintesiPage && !isDatiContabiliPage && (
                    <div className="sintesi-field sintesi-field-checkbox sintesi-field-escludi-prodotti">
                      <label htmlFor="sintesi-escludi-prodotti" className="checkbox-label checkbox-label-inline">
                        <input
                          id="sintesi-escludi-prodotti"
                          type="checkbox"
                          checked={sintesiFiltersForm.escludiProdotti}
                          onChange={(event) => setSintesiFiltersForm((current) => ({
                            ...current,
                            escludiProdotti: event.target.checked,
                          }))}
                        />
                        Escludi prodotti
                      </label>
                    </div>
                  )}
                </div>
                )}

                <div className="inline-actions">
                  <button
                    type="submit"
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiLoadingFilters || sessionLoading}
                  >
                    {(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) ? 'Ricerca in corso...' : 'Cerca'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={refreshSintesiFilters}
                    disabled={sintesiLoadingFilters || sessionLoading}
                  >
                    {sintesiLoadingFilters ? 'Aggiorno...' : 'Aggiorna Filtri'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetSintesi}
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiLoadingFilters || sessionLoading}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={exportSintesiExcel}
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiExportRowsCount === 0}
                  >
                    Export Excel
                  </button>
                  {isProdottiSintesiPage && !isDatiContabiliPage && (
                    <>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={expandAllProducts}
                        disabled={sintesiLoadingData || !hasCollapsedProducts}
                      >
                        Espandi tutto
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={collapseAllProducts}
                        disabled={sintesiLoadingData || !hasProductGroups || areAllProductsCollapsed}
                      >
                        Riduci tutto
                      </button>
                    </>
                  )}
                  {isSintesiFiltersCollapsible && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSintesiFiltersCollapsed((current) => !current)}
                    >
                      {sintesiFiltersCollapsed ? 'Mostra filtri' : 'Nascondi filtri'}
                    </button>
                  )}
                  <span className="sintesi-inline-message" role="status" aria-live="polite" aria-atomic="true">
                    {sintesiLoadingFilters
                      ? `Aggiornamento filtri in corso. ${sintesiFilterLoadingDetail || 'Attendere...'}`
                      : statusMessageVisible}
                  </span>
                  <span className="status-badge neutral sintesi-inline-count-badge">
                    {isDatiContabiliPage ? datiContabiliCountLabel : sintesiCountLabel}
                  </span>
                </div>
              </form>
            </section>

            <section className="panel sintesi-data-panel">
              {isDatiContabiliVenditaPage ? (
                <>
                  {!datiContabiliVenditaSearched && (
                    <p className="empty-state">
                      Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                    </p>
                  )}

                  {datiContabiliVenditaSearched && datiContabiliVenditaSortedRows.length === 0 && (
                    <p className="empty-state">
                      Nessuna vendita trovata con i filtri correnti.
                    </p>
                  )}

                  {datiContabiliVenditaSortedRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno Fattura</th>
                            <th>Data</th>
                            <th>Commessa</th>
                            <th>Descrizione Commessa</th>
                            <th>Tipologia</th>
                            <th>Stato</th>
                            <th>Macrotipologia</th>
                            <th>Controparte</th>
                            <th>Business Unit</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Numero</th>
                            <th>Descrizione Movimento</th>
                            <th>Causale</th>
                            <th>Sottoconto</th>
                            <th>Controparte Movimento</th>
                            <th>Provenienza</th>
                            <th>Temporale</th>
                            <th>Scaduta</th>
                            <th className="num">Fatturato</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Ricavo Ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiContabiliVenditaSortedRows.map((row, index) => (
                            <tr key={`vendita-${row.commessa}-${row.numeroDocumento}-${index}`}>
                              <td>{row.annoFattura ?? ''}</td>
                              <td>{formatDate(row.dataMovimento)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              </td>
                              <td>{row.descrizioneCommessa}</td>
                              <td>{row.tipologiaCommessa}</td>
                              <td>{row.statoCommessa}</td>
                              <td>{row.macroTipologia}</td>
                              <td>{row.controparteCommessa}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{row.numeroDocumento}</td>
                              <td>{row.descrizioneMovimento}</td>
                              <td>{row.causale}</td>
                              <td>{row.sottoconto}</td>
                              <td>{row.controparteMovimento}</td>
                              <td>{row.provenienza}</td>
                              <td>{row.statoTemporale}</td>
                              <td>
                                <span className={`status-badge ${row.isScaduta ? 'ko' : 'neutral'}`}>
                                  {row.isScaduta ? 'Si' : 'No'}
                                </span>
                              </td>
                              <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                              <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                              <td className={`num ${row.ricavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoIpotetico)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : isDatiContabiliAcquistiPage ? (
                <>
                  {!datiContabiliAcquistoSearched && (
                    <p className="empty-state">
                      Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                    </p>
                  )}

                  {datiContabiliAcquistoSearched && datiContabiliAcquistoSortedRows.length === 0 && (
                    <p className="empty-state">
                      Nessun acquisto trovato con i filtri correnti.
                    </p>
                  )}

                  {datiContabiliAcquistoSortedRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno Fattura</th>
                            <th>Data Documento</th>
                            <th>Commessa</th>
                            <th>Descrizione Commessa</th>
                            <th>Tipologia</th>
                            <th>Stato</th>
                            <th>Macrotipologia</th>
                            <th>Controparte</th>
                            <th>Business Unit</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Codice Societa</th>
                            <th>Descrizione Fattura</th>
                            <th>Causale</th>
                            <th>Sottoconto</th>
                            <th>Controparte Movimento</th>
                            <th>Provenienza</th>
                            <th>Temporale</th>
                            <th>Scaduta</th>
                            <th className="num">Importo Complessivo</th>
                            <th className="num">Importo Contabilita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiContabiliAcquistoSortedRows.map((row, index) => (
                            <tr key={`acquisto-${row.commessa}-${row.codiceSocieta}-${index}`}>
                              <td>{row.annoFattura ?? ''}</td>
                              <td>{formatDate(row.dataDocumento)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              </td>
                              <td>{row.descrizioneCommessa}</td>
                              <td>{row.tipologiaCommessa}</td>
                              <td>{row.statoCommessa}</td>
                              <td>{row.macroTipologia}</td>
                              <td>{row.controparteCommessa}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{row.codiceSocieta}</td>
                              <td>{row.descrizioneFattura}</td>
                              <td>{row.causale}</td>
                              <td>{row.sottoconto}</td>
                              <td>{row.controparteMovimento}</td>
                              <td>{row.provenienza}</td>
                              <td>{row.statoTemporale}</td>
                              <td>
                                <span className={`status-badge ${row.isScaduta ? 'ko' : 'neutral'}`}>
                                  {row.isScaduta ? 'Si' : 'No'}
                                </span>
                              </td>
                              <td className={`num ${row.importoComplessivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoComplessivo)}</td>
                              <td className={`num ${row.importoContabilitaDettaglio < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoContabilitaDettaglio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
              {!sintesiSearched && (
                <p className="empty-state">
                  Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                </p>
              )}

              {sintesiSearched && sortedRows.length === 0 && (
                <p className="empty-state">
                  Nessun dato trovato con i filtri correnti.
                </p>
              )}

              {sortedRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('anno')}>
                            Anno <span className="sort-indicator">{sortIndicator('anno')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('commessa')}>
                            Commessa <span className="sort-indicator">{sortIndicator('commessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('descrizioneCommessa')}>
                            Descrizione <span className="sort-indicator">{sortIndicator('descrizioneCommessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('tipologiaCommessa')}>
                            Tipologia <span className="sort-indicator">{sortIndicator('tipologiaCommessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('stato')}>
                            Stato <span className="sort-indicator">{sortIndicator('stato')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('macroTipologia')}>
                            Macrotipologia <span className="sort-indicator">{sortIndicator('macroTipologia')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort(productOrCounterpartColumn)}>
                            {productOrCounterpartLabel} <span className="sort-indicator">{sortIndicator(productOrCounterpartColumn)}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('businessUnit')}>
                            Business Unit <span className="sort-indicator">{sortIndicator('businessUnit')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('rcc')}>
                            RCC <span className="sort-indicator">{sortIndicator('rcc')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('pm')}>
                            PM <span className="sort-indicator">{sortIndicator('pm')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('oreLavorate')}>
                            Ore Lavorate <span className="sort-indicator">{sortIndicator('oreLavorate')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costoPersonale')}>
                            Costo Personale <span className="sort-indicator">{sortIndicator('costoPersonale')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('ricavi')}>
                            Ricavi <span className="sort-indicator">{sortIndicator('ricavi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costi')}>
                            Costi <span className="sort-indicator">{sortIndicator('costi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('ricaviMaturati')}>
                            Ricavi Maturati <span className="sort-indicator">{sortIndicator('ricaviMaturati')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('utileSpecifico')}>
                            Utile Specifico <span className="sort-indicator">{sortIndicator('utileSpecifico')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('ricaviFuturi')}>
                            Ricavi Futuri <span className="sort-indicator">{sortIndicator('ricaviFuturi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costiFuturi')}>
                            Costi Futuri <span className="sort-indicator">{sortIndicator('costiFuturi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('oreFuture')}>
                            Ore Future <span className="sort-indicator">{sortIndicator('oreFuture')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costoPersonaleFuturo')}>
                            Costo Personale Futuro <span className="sort-indicator">{sortIndicator('costoPersonaleFuturo')}</span>
                          </button>
                        </th>
                        {showUtileFineProgettoColumn && (
                          <th className="num">
                            <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('utileFineProgetto')}>
                              Utile a fine progetto <span className="sort-indicator">{sortIndicator('utileFineProgetto')}</span>
                            </button>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sintesiTableRows.map((tableRow) => {
                        if (tableRow.kind === 'prodotto-summary') {
                          const row = tableRow.row
                          return (
                            <tr
                              key={tableRow.key}
                              className={`table-group-summary-row ${tableRow.isCollapsed ? 'is-collapsed' : ''}`}
                            >
                              <td colSpan={10} className="table-group-summary-label">
                                <div className="table-group-summary-label-content">
                                  <button
                                    type="button"
                                    className="group-toggle-button"
                                    onClick={() => toggleProductCollapse(tableRow.productKey)}
                                    aria-expanded={!tableRow.isCollapsed}
                                    title={tableRow.isCollapsed ? `Espandi prodotto ${row.prodotto}` : `Riduci prodotto ${row.prodotto}`}
                                  >
                                    {tableRow.isCollapsed ? '+' : '-'}
                                  </button>
                                  <span>Prodotto: {row.prodotto}</span>
                                  <span className="table-group-summary-count">({tableRow.commesseCount} commesse)</span>
                                </div>
                              </td>
                              <td className="num">{formatNumber(row.oreLavorate)}</td>
                              <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                              <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                              <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                              <td className={`num ${row.ricaviMaturati < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviMaturati)}</td>
                              <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                              <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                              <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                              <td className={`num ${row.oreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(row.oreFuture)}</td>
                              <td className={`num ${row.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonaleFuturo)}</td>
                              {showUtileFineProgettoColumn && (
                                shouldShowUtileFineProgettoForRow(row)
                                  ? (
                                    <td className={`num ${calculateUtileFineProgetto(row) < 0 ? 'num-negative' : ''}`}>{formatNumber(calculateUtileFineProgetto(row))}</td>
                                    )
                                  : <td className="num" />
                              )}
                            </tr>
                          )
                        }

                        const row = tableRow.row
                        return (
                          <tr key={tableRow.key}>
                            <td>{row.anno ?? ''}</td>
                            <td>
                              <button
                                type="button"
                                className="inline-link-button"
                                onClick={() => openCommessaDetail(row.commessa)}
                                title={`Apri dettaglio commessa ${row.commessa}`}
                              >
                                {row.commessa}
                              </button>
                            </td>
                            <td>{row.descrizioneCommessa}</td>
                            <td>{row.tipologiaCommessa}</td>
                            <td>{row.stato}</td>
                            <td>{row.macroTipologia}</td>
                            <td>{isProdottiSintesiPage ? row.prodotto : row.controparte}</td>
                            <td>{row.businessUnit}</td>
                            <td>{row.rcc}</td>
                            <td>{row.pm}</td>
                            <td className="num">{formatNumber(row.oreLavorate)}</td>
                            <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                            <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                            <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                            <td className={`num ${row.ricaviMaturati < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviMaturati)}</td>
                            <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(row.utileSpecifico)}
                            </td>
                            <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                            <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                            <td className={`num ${row.oreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(row.oreFuture)}</td>
                            <td className={`num ${row.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonaleFuturo)}</td>
                            {showUtileFineProgettoColumn && (
                              shouldShowUtileFineProgettoForRow(row)
                                ? (
                                  <td className={`num ${calculateUtileFineProgetto(row) < 0 ? 'num-negative' : ''}`}>{formatNumber(calculateUtileFineProgetto(row))}</td>
                                  )
                                : <td className="num" />
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="table-totals-row">
                        <td colSpan={10} className="table-totals-label">Totale</td>
                        <td className="num">{formatNumber(totals.oreLavorate)}</td>
                        <td className={`num ${totals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costoPersonale)}</td>
                        <td className={`num ${totals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.ricavi)}</td>
                        <td className={`num ${totals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costi)}</td>
                        <td className={`num ${totals.ricaviMaturati < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.ricaviMaturati)}</td>
                        <td className={`num ${totals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                          {formatNumber(totals.utileSpecifico)}
                        </td>
                        <td className={`num ${totals.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.ricaviFuturi)}</td>
                        <td className={`num ${totals.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costiFuturi)}</td>
                        <td className={`num ${totals.oreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.oreFuture)}</td>
                        <td className={`num ${totals.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costoPersonaleFuturo)}</td>
                        {showUtileFineProgettoColumn && (
                          <td className={`num ${totaleUtileFineProgettoValorizzato < 0 ? 'num-negative' : ''}`}>{formatNumber(totaleUtileFineProgettoValorizzato)}</td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
                </>
              )}
            </section>
          </section>

  )
}
