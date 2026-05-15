// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'

type CommesseKpiPageProps = any
type KpiSortDirection = 'asc' | 'desc'

const kpiFrozenColumns = [
  ['annoApertura', 'Anno Apertura'],
  ['commessa', 'Commessa'],
  ['descrizioneCommessa', 'Descrizione'],
  ['tipologiaCommessa', 'Tipologia'],
  ['stato', 'Stato'],
  ['macroTipologia', 'Macrotipologia'],
  ['prodotto', 'Prodotto'],
  ['controparte', 'Controparte'],
  ['businessUnit', 'BU'],
  ['rcc', 'RCC'],
  ['pm', 'PM'],
  ['produzione', 'Produzione'],
] as const

const kpiColumnGroups = [
  {
    label: 'Fine mese precedente',
    className: 'kpi-group-fmp',
    columns: [
      ['orePrevisteFineMesePrecedente', 'Ore previste', 'number'],
      ['oreLavorateFineMesePrecedente', 'Ore lavorate', 'number'],
      ['sovrapercentualeFineMesePrecedente', 'Sovra%', 'percent'],
      ['ricavoFineMesePrecedente', 'Ricavo', 'number'],
      ['maturatoNonFatturatoFineMesePrecedente', 'Mat. non fatt.', 'number'],
      ['costoPersonaleFineMesePrecedente', 'Costo personale', 'number'],
      ['acquistiFineMesePrecedente', 'Acquisti', 'number'],
      ['utileFineMesePrecedente', 'Utile', 'number'],
      ['percentualeUtileFineMesePrecedente', '% utile', 'percent'],
      ['spcMFineMesePrecedente', 'SPC-M', 'number'],
    ],
  },
  {
    label: 'Fine anno',
    className: 'kpi-group-fa',
    columns: [
      ['orePrevisteFineAnno', 'Ore previste', 'number'],
      ['oreLavorateFineAnno', 'Ore lavorate', 'number'],
      ['sovrapercentualeFineAnno', 'Sovra%', 'percent'],
      ['ricavoFineAnno', 'Ricavo', 'number'],
      ['costoPersonaleFineAnno', 'Costo personale', 'number'],
      ['acquistiFineAnno', 'Acquisti', 'number'],
      ['utileFineAnno', 'Utile', 'number'],
      ['percentualeUtileFineAnno', '% utile', 'percent'],
      ['spcMFineAnno', 'SPC-M', 'number'],
    ],
  },
  {
    label: 'Fine commessa',
    className: 'kpi-group-fc',
    columns: [
      ['orePrevisteFineCommessa', 'Ore previste', 'number'],
      ['oreLavorateFineCommessa', 'Ore lavorate', 'number'],
      ['sovrapercentualeFineCommessa', 'Sovra%', 'percent'],
      ['ricavoFineCommessa', 'Ricavo', 'number'],
      ['costoPersonaleFineCommessa', 'Costo personale', 'number'],
      ['acquistiFineCommessa', 'Acquisti', 'number'],
      ['utileFineCommessa', 'Utile', 'number'],
      ['percentualeUtileFineCommessa', '% utile', 'percent'],
      ['spcMFineCommessa', 'SPC-M', 'number'],
    ],
  },
] as const

const kpiMetricColumns = kpiColumnGroups.flatMap((group) => (
  group.columns.map((column) => [...column, group.className] as const)
))

export function CommesseKpiPage(props: CommesseKpiPageProps) {
  const {
    analisiPageCountLabel,
    analisiRccLoading,
    canExportAnalisiPage,
    commesseKpiAnni,
    commesseKpiAnnoOptions,
    commesseKpiBusinessUnit,
    commesseKpiBusinessUnitOptions,
    commesseKpiCommessa,
    commesseKpiCommessaOptions,
    commesseKpiCommessaSearch,
    commesseKpiControparte,
    commesseKpiControparteOptions,
    commesseKpiMacroTipologia,
    commesseKpiMacroTipologiaOptions,
    commesseKpiPm,
    commesseKpiPmSelectItems,
    commesseKpiProdotto,
    commesseKpiProdottoOptions,
    commesseKpiRcc,
    commesseKpiRccSelectItems,
    commesseKpiStato,
    commesseKpiStatoOptions,
    commesseKpiTipologia,
    commesseKpiTipologiaOptions,
    commesseKpiData,
    commesseKpiRows,
    commesseKpiTotals,
    currentProfile,
    exportAnalisiExcel,
    exportAnalisiPdf,
    formatNumber,
    handleAnalisiSubmit,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    loadCommesseKpi,
    openCommessaDetail,
    resetAnalisiFilters,
    setCommesseKpiAnni,
    setCommesseKpiBusinessUnit,
    setCommesseKpiCommessa,
    setCommesseKpiCommessaSearch,
    setCommesseKpiControparte,
    setCommesseKpiMacroTipologia,
    setCommesseKpiPm,
    setCommesseKpiProdotto,
    setCommesseKpiRcc,
    setCommesseKpiStato,
    setCommesseKpiTipologia,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed,
  } = props as any

  const [sortColumn, setSortColumn] = useState<string | null>('annoApertura')
  const [sortDirection, setSortDirection] = useState<KpiSortDirection>('desc')

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection(column === 'annoApertura' ? 'desc' : 'asc')
  }

  const sortIndicator = (column: string) => {
    if (sortColumn !== column) {
      return '<>'
    }

    return sortDirection === 'asc' ? '^' : 'v'
  }

  const formatMetric = (value: number, kind: string) => {
    if (!Number.isFinite(value)) {
      return ''
    }

    if (kind === 'percent') {
      return `${(value * 100).toLocaleString('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}%`
    }

    return formatNumber(value)
  }

  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      return commesseKpiRows
    }

    const compareText = (left: string, right: string) => left.localeCompare(right, 'it', { sensitivity: 'base' })
    const compareNumber = (left: number, right: number) => left - right

    return [...commesseKpiRows].sort((left, right) => {
      const leftValue = left[sortColumn]
      const rightValue = right[sortColumn]
      const comparison = typeof leftValue === 'number' || typeof rightValue === 'number'
        ? compareNumber(Number(leftValue ?? 0), Number(rightValue ?? 0))
        : compareText(String(leftValue ?? ''), String(rightValue ?? ''))

      if (comparison !== 0) {
        return sortDirection === 'asc' ? comparison : -comparison
      }

      return compareText(left.commessa ?? '', right.commessa ?? '')
    })
  }, [commesseKpiRows, sortColumn, sortDirection])

  const dataRiferimentoLabel = commesseKpiData?.items?.[0]?.dataRiferimento
    ? new Date(commesseKpiData.items[0].dataRiferimento).toLocaleDateString('it-IT')
    : '-'

  return (
    <section className="panel sintesi-page analisi-rcc-page">
      <header className="panel-header">
        <h2>Analisi Commesse - KPI Commesse</h2>
        <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
      </header>

      <section className="panel sintesi-filter-panel">
        <form
          className={`sintesi-form ${analisiRccLoading ? 'is-filter-loading' : ''}`}
          onSubmit={handleAnalisiSubmit}
          aria-busy={analisiRccLoading}
        >
          {(!isAnalisiSearchCollapsible || !isAnalisiSearchCollapsed) && (
            <div className="sintesi-filters-grid kpi-commesse-filters-grid">
              <div className="sintesi-field sintesi-field-anni">
                <label htmlFor="commesse-kpi-anni">Anno Apertura</label>
                <select
                  id="commesse-kpi-anni"
                  multiple
                  size={2}
                  value={commesseKpiAnni}
                  onChange={(event) => setCommesseKpiAnni(
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )}
                >
                  {commesseKpiAnnoOptions.map((year) => (
                    <option key={`commesse-kpi-anno-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-commessa-search">Ricerca Commessa</label>
                <div className="commessa-inline-controls">
                  <input
                    id="commesse-kpi-commessa-search"
                    type="search"
                    placeholder="Cerca..."
                    value={commesseKpiCommessaSearch}
                    onChange={(event) => setCommesseKpiCommessaSearch(event.target.value)}
                  />
                  <select
                    id="commesse-kpi-commessa"
                    value={commesseKpiCommessa}
                    onChange={(event) => setCommesseKpiCommessa(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {commesseKpiCommessaOptions.map((option) => (
                      <option key={`commesse-kpi-commessa-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-tipologia">Tipologia Commessa</label>
                <select id="commesse-kpi-tipologia" value={commesseKpiTipologia} onChange={(event) => setCommesseKpiTipologia(event.target.value)}>
                  <option value="">Tutte</option>
                  {commesseKpiTipologiaOptions.map((value) => <option key={`commesse-kpi-tipologia-${value}`} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-stato">Stato</label>
                <select id="commesse-kpi-stato" value={commesseKpiStato} onChange={(event) => setCommesseKpiStato(event.target.value)}>
                  <option value="">Tutti</option>
                  {commesseKpiStatoOptions.map((value) => <option key={`commesse-kpi-stato-${value}`} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-macro">Macrotipologia</label>
                <select id="commesse-kpi-macro" value={commesseKpiMacroTipologia} onChange={(event) => setCommesseKpiMacroTipologia(event.target.value)}>
                  <option value="">Tutte</option>
                  {commesseKpiMacroTipologiaOptions.map((value) => <option key={`commesse-kpi-macro-${value}`} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-bu">Business Unit</label>
                <select id="commesse-kpi-bu" value={commesseKpiBusinessUnit} onChange={(event) => setCommesseKpiBusinessUnit(event.target.value)}>
                  <option value="">Tutte</option>
                  {commesseKpiBusinessUnitOptions.map((value) => <option key={`commesse-kpi-bu-${value}`} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-controparte">Controparte</label>
                <select id="commesse-kpi-controparte" value={commesseKpiControparte} onChange={(event) => setCommesseKpiControparte(event.target.value)}>
                  <option value="">Tutte</option>
                  {commesseKpiControparteOptions.map((value) => <option key={`commesse-kpi-controparte-${value}`} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-rcc">RCC</label>
                <select id="commesse-kpi-rcc" value={commesseKpiRcc} onChange={(event) => setCommesseKpiRcc(event.target.value)}>
                  <option value="">Tutti</option>
                  {commesseKpiRccSelectItems.map((option) => <option key={`commesse-kpi-rcc-${option.value}`} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-pm">PM</label>
                <select id="commesse-kpi-pm" value={commesseKpiPm} onChange={(event) => setCommesseKpiPm(event.target.value)}>
                  <option value="">Tutti</option>
                  {commesseKpiPmSelectItems.map((option) => <option key={`commesse-kpi-pm-${option.value}`} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <div className="sintesi-field">
                <label htmlFor="commesse-kpi-prodotto">Prodotto</label>
                <select id="commesse-kpi-prodotto" value={commesseKpiProdotto} onChange={(event) => setCommesseKpiProdotto(event.target.value)}>
                  <option value="">Tutti</option>
                  <option value="__exclude_products__">Escludi prodotti</option>
                  {commesseKpiProdottoOptions.map((value) => <option key={`commesse-kpi-prodotto-${value}`} value={value}>{value}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="inline-actions">
            <button type="submit" disabled={analisiRccLoading}>
              {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
            </button>
            <button type="button" className="ghost-button" onClick={resetAnalisiFilters} disabled={analisiRccLoading}>
              Reset
            </button>
            <button type="button" className="ghost-button" onClick={exportAnalisiExcel} disabled={analisiRccLoading || !canExportAnalisiPage}>
              Export Excel
            </button>
            <button type="button" className="ghost-button" onClick={() => exportAnalisiPdf(sortedRows)} disabled={analisiRccLoading || !canExportAnalisiPage}>
              Export PDF
            </button>
            <button type="button" className="ghost-button" onClick={() => loadCommesseKpi()} disabled={analisiRccLoading}>
              Aggiorna
            </button>
            {isAnalisiSearchCollapsible && (
              <button type="button" className="ghost-button" onClick={toggleAnalisiSearchCollapsed}>
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
            {commesseKpiData
              ? `KPI commesse caricati: ${commesseKpiRows.length} righe. Data riferimento: ${dataRiferimentoLabel}.`
              : statusMessageVisible}
          </p>
        </div>
      </section>

      <section className="panel analisi-rcc-grid-card">
        <header className="panel-header">
          <h3>KPI Commesse</h3>
        </header>

        {commesseKpiRows.length === 0 && !analisiRccLoading && (
          <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
        )}

        {commesseKpiRows.length > 0 && (
          <div className="bonifici-table-wrap bonifici-table-wrap-main">
            <table className="bonifici-table kpi-commesse-table">
              <thead>
                <tr className="kpi-group-header-row">
                  <th colSpan={3} className="kpi-static-group-head">Dati commessa</th>
                  <th colSpan={kpiFrozenColumns.length - 3} className="kpi-anagrafica-group-head">Anagrafica</th>
                  {kpiColumnGroups.map((group) => (
                    <th
                      key={`kpi-group-${group.className}`}
                      colSpan={group.columns.length}
                      className={`kpi-group-head ${group.className}`}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {kpiFrozenColumns.map(([key, label]) => (
                    <th key={`kpi-head-${key}`}>
                      <button type="button" className="sort-header-btn" onClick={() => toggleSort(key)}>
                        {label} <span className="sort-indicator">{sortIndicator(key)}</span>
                      </button>
                    </th>
                  ))}
                  {kpiMetricColumns.map(([key, label, , groupClass]) => (
                    <th key={`kpi-head-${key}`} className={`num kpi-metric-head ${groupClass}`}>
                      <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort(key)}>
                        {label} <span className="sort-indicator">{sortIndicator(key)}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={`commesse-kpi-row-${row.annoApertura}-${row.commessa}-${index}`}>
                    <td>{row.annoApertura}</td>
                    <td>
                      {row.commessa.trim()
                        ? (
                          <button type="button" className="inline-link-button" onClick={() => openCommessaDetail(row.commessa)} title={`Apri dettaglio commessa ${row.commessa}`}>
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
                    {kpiMetricColumns.map(([key, , kind, groupClass]) => (
                      <td key={`kpi-cell-${key}`} className={`num ${groupClass} ${Number(row[key]) < 0 ? 'num-negative' : ''}`}>
                        {formatMetric(Number(row[key] ?? 0), kind)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-totals-row">
                  <td className="table-totals-label">Totale</td>
                  {Array.from({ length: 11 }).map((_, index) => <td key={`kpi-total-empty-${index}`} aria-hidden="true"></td>)}
                  {kpiMetricColumns.map(([key, , kind, groupClass]) => (
                    <td key={`kpi-total-${key}`} className={`num ${groupClass} ${Number(commesseKpiTotals[key]) < 0 ? 'num-negative' : ''}`}>
                      {formatMetric(Number(commesseKpiTotals[key] ?? 0), kind)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
