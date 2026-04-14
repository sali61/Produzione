// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type RisorsePageProps = any

export function RisorsePage(props: RisorsePageProps) {
  const {
    addRisorsePivotSelectedFields,
    analisiRccLoading,
    asRisorsePivotFieldKeys,
    canAccessRisultatiRisorseMenu,
    canExportAnalisiPage,
    currentProfile,
    exportAnalisiExcel,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    isRisorseMensilePage,
    isRisorseOuMode,
    isRisorsePivotPage,
    moveRisorsePivotField,
    normalizeRisorsaLabel,
    openCommessaDetail,
    refreshRisorseFilters,
    removeRisorsePivotSelectedFields,
    resetRisorseFilters,
    resolveOuValue,
    risorseAnnoOptions,
    risorseCommessaOptions,
    risorseCommessaSearch,
    risorseCountLabel,
    risorseEntityFilterLabel,
    risorseFatturatoLabel,
    risorseFiltersForm,
    risorseFormDisabled,
    risorseMeseOptions,
    risorsePivotAvailableFieldOptions,
    risorsePivotAvailableSelection,
    risorsePivotRows,
    risorsePivotSelectedFieldOptions,
    risorsePivotSelectedSelection,
    risorseRisorsaOptions,
    risorseRisorsaSearch,
    risorseRowsSorted,
    risorseSearched,
    risorseSelects,
    risorseTitle,
    risorseTotals,
    risorseUtileLabel,
    setRisorseCommessaSearch,
    setRisorseFiltersForm,
    setRisorsePivotAvailableSelection,
    setRisorsePivotSelectedSelection,
    setRisorseRisorsaSearch,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed,
  } = props as any

  return (
  <section className="panel sintesi-page analisi-rcc-page">
    <header className="panel-header">
      <h2>{risorseTitle}</h2>
      <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
    </header>

    {!canAccessRisultatiRisorseMenu && (
      <p className="empty-state">
        Il profilo corrente non e' abilitato a Risultati Risorse.
      </p>
    )}

    {canAccessRisultatiRisorseMenu && (
      <>
        <section className="panel sintesi-filter-panel">
          <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
            {!isAnalisiSearchCollapsed && (
              <>
                <label className="analisi-rcc-year-field" htmlFor="risorse-anni">
                  <span>{isRisorseMensilePage ? 'Anni competenza (corrente + precedente)' : 'Anni competenza'}</span>
                  <select
                    id="risorse-anni"
                    multiple
                    size={4}
                    value={risorseFiltersForm.anni}
                    disabled={risorseFormDisabled}
                    onChange={(event) => setRisorseFiltersForm((current) => ({
                      ...current,
                      anni: Array.from(event.target.selectedOptions).map((option) => option.value),
                    }))}
                  >
                    {risorseAnnoOptions.map((year) => (
                      <option key={`risorse-anno-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                {isRisorseMensilePage && (
                  <label className="analisi-rcc-year-field" htmlFor="risorse-mesi">
                    <span>Mesi competenza</span>
                    <select
                      id="risorse-mesi"
                      multiple
                      size={4}
                      value={risorseFiltersForm.mesi}
                      disabled={risorseFormDisabled}
                      onChange={(event) => setRisorseFiltersForm((current) => ({
                        ...current,
                        mesi: Array.from(event.target.selectedOptions).map((option) => option.value),
                      }))}
                    >
                      {risorseMeseOptions.map((option) => (
                        <option key={`risorse-mese-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="analisi-rcc-year-field" htmlFor="risorse-commessa-search">
                  <span>Ricerca Commessa</span>
                  <div className="commessa-inline-controls">
                    <input
                      id="risorse-commessa-search"
                      value={risorseCommessaSearch}
                      disabled={risorseFormDisabled}
                      onChange={(event) => setRisorseCommessaSearch(event.target.value)}
                      placeholder="Cerca commessa..."
                    />
                    <select
                      id="risorse-commessa"
                      value={risorseFiltersForm.commessa}
                      disabled={risorseFormDisabled}
                      onChange={(event) => setRisorseFiltersForm((current) => ({
                        ...current,
                        commessa: event.target.value,
                      }))}
                    >
                      <option value="">Tutte</option>
                      {risorseCommessaOptions.map((option) => (
                        <option key={`risorse-commessa-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                {risorseSelects.map((selectField) => (
                  <label
                    key={selectField.id}
                    className="analisi-rcc-year-field"
                    htmlFor={selectField.id}
                  >
                    <span>{selectField.label}</span>
                    <select
                      id={selectField.id}
                      value={risorseFiltersForm[selectField.key]}
                      disabled={risorseFormDisabled}
                      onChange={(event) => setRisorseFiltersForm((current) => ({
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
                  </label>
                ))}

                {!isRisorseOuMode && (
                  <>
                    <label className="analisi-rcc-year-field" htmlFor="risorse-risorsa-search">
                      <span>{`Filtro ${risorseEntityFilterLabel}`}</span>
                      <input
                        id="risorse-risorsa-search"
                        value={risorseRisorsaSearch}
                        disabled={risorseFormDisabled}
                        onChange={(event) => setRisorseRisorsaSearch(event.target.value)}
                        placeholder="Cerca risorsa..."
                      />
                    </label>

                    <label className="analisi-rcc-year-field" htmlFor="risorse-id-risorsa">
                      <span>{risorseEntityFilterLabel}</span>
                      <select
                        id="risorse-id-risorsa"
                        value={risorseFiltersForm.idRisorsa}
                        disabled={risorseFormDisabled}
                        onChange={(event) => setRisorseFiltersForm((current) => ({
                          ...current,
                          idRisorsa: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {risorseRisorsaOptions.map((option) => (
                          <option key={`risorse-anagrafica-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label className="checkbox-label" htmlFor="risorse-vista-costo">
                  <input
                    id="risorse-vista-costo"
                    type="checkbox"
                    checked={risorseFiltersForm.vistaCosto}
                    disabled={risorseFormDisabled}
                    onChange={(event) => setRisorseFiltersForm((current) => ({
                      ...current,
                      vistaCosto: event.target.checked,
                    }))}
                  />
                  Visualizza valori su costo
                </label>
              </>
            )}

            <div className="inline-actions analisi-inline-actions">
              <button type="submit" disabled={risorseFormDisabled}>
                {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={refreshRisorseFilters}
                disabled={risorseFormDisabled}
              >
                Aggiorna Filtri
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={resetRisorseFilters}
                disabled={risorseFormDisabled}
              >
                Reset
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={exportAnalisiExcel}
                disabled={risorseFormDisabled || !canExportAnalisiPage}
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
                {risorseCountLabel}
              </span>
            </div>
          </form>
          <div className="sintesi-toolbar-row">
            <p className="sintesi-toolbar-message">
              {risorseSearched
                ? `Ricerca completata (${isRisorseMensilePage ? 'mensile' : 'annuale'}, ${risorseFiltersForm.vistaCosto ? 'base costo' : 'base ore'}).`
                : statusMessageVisible}
            </p>
          </div>
        </section>

        {isRisorsePivotPage && !isAnalisiSearchCollapsed && (
          <section className="panel analisi-rcc-grid-card dati-annuali-pivot-config-panel">
            <header className="panel-header">
              <h3>Configurazione Pivot Risorse</h3>
            </header>
            <div className="dati-annuali-pivot-config-grid">
              <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="risorse-pivot-fields-available">
                <span>Campi disponibili</span>
                <select
                  id="risorse-pivot-fields-available"
                  multiple
                  size={8}
                  value={risorsePivotAvailableSelection}
                  onChange={(event) => setRisorsePivotAvailableSelection(
                    asRisorsePivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                  )}
                >
                  {risorsePivotAvailableFieldOptions.map((option) => (
                    <option key={`risorse-pivot-available-${option.key}`} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="dati-annuali-pivot-config-actions">
                <button
                  type="button"
                  onClick={addRisorsePivotSelectedFields}
                  disabled={risorsePivotAvailableSelection.length === 0}
                >
                  Aggiungi
                </button>
                <button
                  type="button"
                  onClick={removeRisorsePivotSelectedFields}
                  disabled={risorsePivotSelectedSelection.length === 0}
                >
                  Rimuovi
                </button>
                <button
                  type="button"
                  onClick={() => moveRisorsePivotField('up')}
                  disabled={risorsePivotSelectedSelection.length !== 1}
                >
                  Su
                </button>
                <button
                  type="button"
                  onClick={() => moveRisorsePivotField('down')}
                  disabled={risorsePivotSelectedSelection.length !== 1}
                >
                  Giu
                </button>
              </div>
              <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="risorse-pivot-fields-selected">
                <span>Livelli aggregazione (ordine pivot)</span>
                <select
                  id="risorse-pivot-fields-selected"
                  multiple
                  size={8}
                  value={risorsePivotSelectedSelection}
                  onChange={(event) => setRisorsePivotSelectedSelection(
                    asRisorsePivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                  )}
                >
                  {risorsePivotSelectedFieldOptions.map((option) => (
                    <option key={`risorse-pivot-selected-${option.key}`} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        <section className="panel analisi-rcc-grid-card">
          <header className="panel-header">
            <h3>{isRisorsePivotPage ? 'Risultati Risorse (Pivot)' : 'Risultati Risorse'}</h3>
          </header>

          {!risorseSearched && !analisiRccLoading && (
            <p className="empty-state">Imposta i filtri e premi Cerca.</p>
          )}

          {risorseSearched && !analisiRccLoading && (isRisorsePivotPage ? risorsePivotRows.length : risorseRowsSorted.length) === 0 && (
            <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
          )}

          {isRisorsePivotPage && risorsePivotRows.length > 0 && (
            <div className="bonifici-table-wrap bonifici-table-wrap-main">
              <table className="bonifici-table">
                <thead>
                  <tr>
                    <th>Etichette di riga</th>
                    <th className="num">Numero Commesse</th>
                    <th className="num">Ore Totali</th>
                    <th className="num">Costo Specifico Risorsa</th>
                    <th className="num">{risorseFatturatoLabel}</th>
                    <th className="num">{risorseUtileLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {risorsePivotRows.map((row) => (
                    <tr key={row.key} className={row.kind === 'totale' ? 'table-totals-row' : 'table-group-summary-row'}>
                      <td className="table-group-summary-label">
                        <span className={`dati-annuali-pivot-label level-${Math.min(row.level, 6)}`}>
                          {row.label}
                        </span>
                      </td>
                      <td className="num">{row.numeroCommesse.toLocaleString('it-IT')}</td>
                      <td className="num">{formatNumber(row.oreTotali)}</td>
                      <td className={`num ${row.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoSpecificoRisorsa)}</td>
                      <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                      <td className={`num ${row.utile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utile)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isRisorsePivotPage && risorseRowsSorted.length > 0 && (
            <div className="bonifici-table-wrap bonifici-table-wrap-main">
              <table className="bonifici-table">
                <thead>
                  <tr>
                    <th>Anno</th>
                    {isRisorseMensilePage && <th>Mese</th>}
                    <th>Commessa</th>
                    <th>Descrizione</th>
                    <th>Tipologia</th>
                    <th>Stato</th>
                    <th>Macrotipologia</th>
                    <th>Controparte</th>
                    <th>Business Unit</th>
                    <th>OU</th>
                    <th>RCC</th>
                    <th>PM</th>
                    <th>{risorseEntityFilterLabel}</th>
                    <th className="num">Ore Totali</th>
                    <th className="num">Costo Specifico Risorsa</th>
                    <th className="num">{risorseFatturatoLabel}</th>
                    <th className="num">{risorseUtileLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {risorseRowsSorted.map((row, index) => (
                    <tr key={`risorse-row-${row.annoCompetenza}-${row.meseCompetenza ?? 0}-${row.commessa}-${row.idRisorsa}-${index}`}>
                      <td>{row.annoCompetenza}</td>
                      {isRisorseMensilePage && <td>{row.meseCompetenza ? row.meseCompetenza.toString().padStart(2, '0') : ''}</td>}
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
                      <td>{row.controparte}</td>
                      <td>{row.businessUnit}</td>
                      <td>{resolveOuValue(row)}</td>
                      <td>{row.rcc}</td>
                      <td>{row.pm}</td>
                      <td>{normalizeRisorsaLabel(row)}</td>
                      <td className="num">{formatNumber(row.oreTotali)}</td>
                      <td className={`num ${row.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoSpecificoRisorsa)}</td>
                      <td className={`num ${(risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre) < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre)}
                      </td>
                      <td className={`num ${(risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre) < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-totals-row">
                    <td colSpan={isRisorseMensilePage ? 13 : 12} className="table-totals-label">Totale</td>
                    <td className="num">{formatNumber(risorseTotals.oreTotali)}</td>
                    <td className={`num ${risorseTotals.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.costoSpecificoRisorsa)}</td>
                    <td className={`num ${risorseTotals.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.fatturato)}</td>
                    <td className={`num ${risorseTotals.utile < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.utile)}</td>
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
