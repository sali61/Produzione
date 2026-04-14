// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type CommesseDatiAnnualiAggregatiPageProps = any

export function CommesseDatiAnnualiAggregatiPage(props: CommesseDatiAnnualiAggregatiPageProps) {
  const {
    addCommesseDatiAnnualiSelectedFields,
    analisiRccLoading,
    asDatiAnnualiPivotFieldKeys,
    commesseDatiAnnualiAnni,
    commesseDatiAnnualiAnnoOptions,
    commesseDatiAnnualiAvailableFieldOptions,
    commesseDatiAnnualiAvailableSelection,
    commesseDatiAnnualiBusinessUnit,
    commesseDatiAnnualiBusinessUnitOptions,
    commesseDatiAnnualiColonneAggregazione,
    commesseDatiAnnualiData,
    commesseDatiAnnualiFiltersCollapsed,
    commesseDatiAnnualiMacroTipologiaOptions,
    commesseDatiAnnualiMacroTipologie,
    commesseDatiAnnualiPivotRows,
    commesseDatiAnnualiPm,
    commesseDatiAnnualiPmOptions,
    commesseDatiAnnualiRcc,
    commesseDatiAnnualiRccOptions,
    commesseDatiAnnualiSelectedFieldOptions,
    commesseDatiAnnualiSelectedSelection,
    commesseDatiAnnualiTipologia,
    commesseDatiAnnualiTipologiaOptions,
    commesseDatiAnnualiUseAggregationColumns,
    currentProfile,
    exportCommesseDatiAnnualiExcel,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    moveCommesseDatiAnnualiField,
    removeCommesseDatiAnnualiSelectedFields,
    resetAnalisiFilters,
    setCommesseDatiAnnualiAnni,
    setCommesseDatiAnnualiAvailableSelection,
    setCommesseDatiAnnualiBusinessUnit,
    setCommesseDatiAnnualiColonneAggregazione,
    setCommesseDatiAnnualiFiltersCollapsed,
    setCommesseDatiAnnualiMacroTipologie,
    setCommesseDatiAnnualiPm,
    setCommesseDatiAnnualiRcc,
    setCommesseDatiAnnualiSelectedSelection,
    setCommesseDatiAnnualiTipologia,
    statusMessageVisible,
  } = props as any

  return (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Dati Annuali Aggregati</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form
                id="commesse-dati-annuali-aggregati-form"
                className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`}
                onSubmit={handleAnalisiSubmit}
              >
                {!commesseDatiAnnualiFiltersCollapsed && (
                  <>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-anni">
                      <span>Anni</span>
                      <select
                        id="commesse-dati-annuali-anni"
                        multiple
                        size={4}
                        value={commesseDatiAnnualiAnni}
                        onChange={(event) => setCommesseDatiAnnualiAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {commesseDatiAnnualiAnnoOptions.map((year) => (
                          <option key={`commesse-dati-annuali-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-macrotipologia">
                      <span>Macrotipologia</span>
                      <select
                        id="commesse-dati-annuali-macrotipologia"
                        multiple
                        size={4}
                        value={commesseDatiAnnualiMacroTipologie}
                        onChange={(event) => setCommesseDatiAnnualiMacroTipologie(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {commesseDatiAnnualiMacroTipologiaOptions.map((option) => (
                          <option key={`commesse-dati-annuali-macro-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-tipologia">
                      <span>Tipologia Commessa</span>
                      <select
                        id="commesse-dati-annuali-tipologia"
                        value={commesseDatiAnnualiTipologia}
                        onChange={(event) => setCommesseDatiAnnualiTipologia(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseDatiAnnualiTipologiaOptions.map((option) => (
                          <option key={`commesse-dati-annuali-tipologia-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-bu">
                      <span>BU</span>
                      <select
                        id="commesse-dati-annuali-bu"
                        value={commesseDatiAnnualiBusinessUnit}
                        onChange={(event) => setCommesseDatiAnnualiBusinessUnit(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        {commesseDatiAnnualiBusinessUnitOptions.map((option) => (
                          <option key={`commesse-dati-annuali-bu-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-rcc">
                      <span>RCC</span>
                      <select
                        id="commesse-dati-annuali-rcc"
                        value={commesseDatiAnnualiRcc}
                        onChange={(event) => setCommesseDatiAnnualiRcc(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {commesseDatiAnnualiRccOptions.map((option) => (
                          <option key={`commesse-dati-annuali-rcc-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-pm">
                      <span>PM</span>
                      <select
                        id="commesse-dati-annuali-pm"
                        value={commesseDatiAnnualiPm}
                        onChange={(event) => setCommesseDatiAnnualiPm(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {commesseDatiAnnualiPmOptions.map((option) => (
                          <option key={`commesse-dati-annuali-pm-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </form>
              <div className="sintesi-toolbar-row">
                <p className="sintesi-toolbar-message">
                  {commesseDatiAnnualiData
                    ? `Dati annuali caricati (anni: ${commesseDatiAnnualiData.anni.join(', ') || '-'}). Livelli selezionati: ${commesseDatiAnnualiSelectedFieldOptions.map((item) => item.label).join(' > ') || 'solo anno'}.`
                    : statusMessageVisible}
                </p>
              </div>
            </section>

            {!commesseDatiAnnualiFiltersCollapsed && (
            <section className="panel analisi-rcc-grid-card dati-annuali-pivot-config-panel">
              <header className="panel-header">
                <h3>Configurazione Pivot</h3>
              </header>
              <div className="dati-annuali-pivot-config-grid">
                <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="commesse-dati-annuali-fields-available">
                  <span>Campi disponibili</span>
                  <select
                    id="commesse-dati-annuali-fields-available"
                    multiple
                    size={8}
                    value={commesseDatiAnnualiAvailableSelection}
                    onChange={(event) => setCommesseDatiAnnualiAvailableSelection(
                      asDatiAnnualiPivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                    )}
                  >
                    {commesseDatiAnnualiAvailableFieldOptions.map((option) => (
                      <option key={`commesse-dati-annuali-available-${option.key}`} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dati-annuali-pivot-config-actions">
                  <button
                    type="button"
                    onClick={addCommesseDatiAnnualiSelectedFields}
                    disabled={commesseDatiAnnualiAvailableSelection.length === 0}
                  >
                    Aggiungi
                  </button>
                  <button
                    type="button"
                    onClick={removeCommesseDatiAnnualiSelectedFields}
                    disabled={commesseDatiAnnualiSelectedSelection.length === 0}
                  >
                    Rimuovi
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCommesseDatiAnnualiField('up')}
                    disabled={commesseDatiAnnualiSelectedSelection.length !== 1}
                  >
                    Su
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCommesseDatiAnnualiField('down')}
                    disabled={commesseDatiAnnualiSelectedSelection.length !== 1}
                  >
                    Giu
                  </button>
                </div>
                <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="commesse-dati-annuali-fields-selected">
                  <span>Livelli aggregazione (ordine pivot)</span>
                  <select
                    id="commesse-dati-annuali-fields-selected"
                    multiple
                    size={8}
                    value={commesseDatiAnnualiSelectedSelection}
                    onChange={(event) => setCommesseDatiAnnualiSelectedSelection(
                      asDatiAnnualiPivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                    )}
                  >
                    {commesseDatiAnnualiSelectedFieldOptions.map((option) => (
                      <option key={`commesse-dati-annuali-selected-${option.key}`} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            )}
            <div className="inline-actions">
              <button
                type="submit"
                form="commesse-dati-annuali-aggregati-form"
                disabled={analisiRccLoading}
              >
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
                onClick={exportCommesseDatiAnnualiExcel}
                disabled={analisiRccLoading || commesseDatiAnnualiPivotRows.length === 0}
              >
                Export Excel
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCommesseDatiAnnualiFiltersCollapsed((current) => !current)}
              >
                {commesseDatiAnnualiFiltersCollapsed ? 'Mostra filtri e aggregazione' : 'Nascondi filtri e aggregazione'}
              </button>
              <label className="checkbox-label checkbox-label-inline" htmlFor="commesse-dati-annuali-colonne-aggregazione">
                <input
                  id="commesse-dati-annuali-colonne-aggregazione"
                  type="checkbox"
                  checked={commesseDatiAnnualiColonneAggregazione}
                  onChange={(event) => setCommesseDatiAnnualiColonneAggregazione(event.target.checked)}
                />
                Colonne aggregazioni
              </label>
              <span className="status-badge neutral sintesi-inline-count-badge">
                {commesseDatiAnnualiPivotRows.length} righe
              </span>
            </div>

            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>Dati Annuali Aggregati (Pivot)</h3>
              </header>

              {commesseDatiAnnualiPivotRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}

              {commesseDatiAnnualiPivotRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        {commesseDatiAnnualiUseAggregationColumns
                          ? commesseDatiAnnualiSelectedFieldOptions.map((option) => (
                            <th key={`dati-annuali-col-${option.key}`}>{option.label}</th>
                          ))
                          : <th>Etichette di riga</th>}
                        <th className="num">Numero Commesse</th>
                        <th className="num">Ore Lavorate</th>
                        <th className="num">Costo Personale</th>
                        <th className="num">Ricavi</th>
                        <th className="num">Costi</th>
                        <th className="num">Utile Specifico</th>
                        <th className="num">Ricavi Futuri</th>
                        <th className="num">Costi Futuri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commesseDatiAnnualiPivotRows.map((row) => (
                        <tr
                          key={row.key}
                          className={row.kind === 'totale' ? 'table-totals-row' : 'table-group-summary-row'}
                        >
                          {commesseDatiAnnualiUseAggregationColumns
                            ? commesseDatiAnnualiSelectedFieldOptions.map((option, index) => (
                              <td key={`${row.key}-${option.key}`} className="table-group-summary-label">
                                {row.kind === 'totale'
                                  ? (index === 0 ? row.label : '')
                                  : (row.groupValues[option.key] ?? '')}
                              </td>
                            ))
                            : (
                              <td className="table-group-summary-label">
                                <span className={`dati-annuali-pivot-label level-${Math.min(row.level, 6)}`}>
                                  {row.label}
                                </span>
                              </td>
                            )}
                          <td className="num">{row.numeroCommesse.toLocaleString('it-IT')}</td>
                          <td className="num">{formatNumber(row.oreLavorate)}</td>
                          <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                          <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                          <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                          <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                          <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
  )
}
