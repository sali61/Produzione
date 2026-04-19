// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from 'react'

type CommessaDettaglioPageProps = any

export function CommessaDettaglioPage(props: CommessaDettaglioPageProps) {
  const {
    backToSintesi,
    detailAcquistiDateSortIndicator,
    detailAcquistiSorted,
    detailAcquistiTotaleImporto,
    detailActiveTab,
    detailAnagrafica,
    detailAvanzamentoStorico,
    detailCommessa,
    detailConsuntivoMesePrecedente,
    detailCostiFuturiAggregati,
    detailCostiPassatiRiconciliati,
    detailCostoPersonaleFuturoProiezione,
    detailCurrentYear,
    detailData,
    detailLastDayPreviousMonth,
    detailLoading,
    detailOfferteSorted,
    detailOrdiniAggregati,
    detailOrdiniPercentualeQuantita,
    detailOrdiniSorted,
    detailOreFuture,
    detailOreRestantiInput,
    detailOreRestantiProiezione,
    detailOreSpeseRisorseRows,
    detailOreSpeseRisorseTotal,
    detailPercentRaggiuntoInput,
    detailRequisitiOreRisorseRows,
    detailRequisitiOreRows,
    detailRequisitiOreTotals,
    detailRicaviAnniSuccessivi,
    detailRicaviFuturiAggregati,
    detailRicavoMaturatoAlMesePrecedente,
    detailRicavoPrevisto,
    detailRicavoPrevistoInput,
    detailSaving,
    detailSintesiRows,
    detailStatusMessage,
    detailTotals,
    detailUtileConsuntivatoRiconciliato,
    detailUtileFineProgetto,
    detailUtileRicalcolatoMesePrecedente,
    detailVenditeDateSortIndicator,
    detailVenditeSorted,
    detailVenditeTotaleImporto,
    openDetailSintesiMailModal,
    exportDettaglioPdf,
    exportDettaglioExcel,
    formatDate,
    formatNumber,
    formatPercentRatio,
    formatPercentValue,
    handleDetailOreRestantiInputBlur,
    handleDetailOreRestantiInputChange,
    handleDetailPercentRaggiuntoInputBlur,
    handleDetailPercentRaggiuntoInputChange,
    handleDetailRicavoPrevistoInputBlur,
    handleDetailRicavoPrevistoInputChange,
    handleSaveDetailPercentRaggiunto,
    selectedRequisitoId,
    setDetailActiveTab,
    toggleDetailAcquistiDateSort,
    toggleDetailVenditeDateSort,
    toggleRequisitoDettaglio,
  } = props as any

  return (
          <section className="panel sintesi-page detail-page">
            <span className="sr-only" aria-live="polite">
              {`Dettaglio commessa ${detailCommessa ? `"${detailCommessa}"` : ''}. ${
                detailStatusMessage || 'Dettaglio commessa in caricamento.'
              }`}
            </span>

            <section className="detail-top-zone">
              <section className="panel detail-anagrafica-panel">
                <header className="panel-header">
                  <h3>Anagrafica Commessa</h3>
                  <div className="detail-header-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={exportDettaglioPdf}
                      disabled={detailLoading || !detailData}
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={exportDettaglioExcel}
                      disabled={detailLoading || !detailData}
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={openDetailSintesiMailModal}
                      disabled={detailLoading || !detailData?.commessa}
                    >
                      Invia sintesi
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={backToSintesi}
                    >
                      Torna a Sintesi
                    </button>
                  </div>
                </header>

              {!detailAnagrafica && !detailLoading && (
                <p className="empty-state">Nessun dato anagrafico disponibile per la commessa selezionata.</p>
              )}

              {detailAnagrafica && (
                <div className="bonifici-table-wrap">
                  <table className="bonifici-table detail-anagrafica-table">
                    <thead>
                      <tr>
                        <th>Commessa</th>
                        <th>Descrizione</th>
                        <th>Tipologia</th>
                        <th>Stato</th>
                        <th>Macrotipologia</th>
                        <th>Prodotto</th>
                        <th>Controparte</th>
                        <th>Business Unit</th>
                        <th>RCC</th>
                        <th>PM</th>
                        <th>Data apertura</th>
                        <th>Data chiusura</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{detailAnagrafica.commessa}</td>
                        <td>{detailAnagrafica.descrizioneCommessa}</td>
                        <td>{detailAnagrafica.tipologiaCommessa}</td>
                        <td>{detailAnagrafica.stato}</td>
                        <td>{detailAnagrafica.macroTipologia}</td>
                        <td>{detailAnagrafica.prodotto}</td>
                        <td>{detailAnagrafica.controparte}</td>
                        <td>{detailAnagrafica.businessUnit}</td>
                        <td>{detailAnagrafica.rcc}</td>
                        <td>{detailAnagrafica.pm}</td>
                        <td>{formatDate(detailAnagrafica.dataApertura)}</td>
                        <td>{formatDate(detailAnagrafica.dataChiusura)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel detail-summary-strip-panel">
              <div className="bonifici-table-wrap detail-kpi-table-wrap" role="status" aria-live="polite">
                <table className="bonifici-table detail-kpi-table">
                  <thead>
                    <tr>
                      <th className="detail-kpi-group-head" colSpan={5}>
                        Consuntivato {detailLastDayPreviousMonth ? `${detailLastDayPreviousMonth.toLocaleDateString('it-IT')} (anni precedenti inclusi)` : 'mese precedente'}
                      </th>
                      <th className="detail-kpi-group-head" colSpan={4}>
                        {detailCurrentYear > 0 ? `Futuro ${detailCurrentYear}` : 'Futuro'}
                      </th>
                      <th className="detail-kpi-group-head" colSpan={7}>
                        Proiezione {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : 'mese precedente'}
                      </th>
                      <th className="detail-kpi-group-head detail-kpi-action-col" colSpan={1}>
                        Azione
                      </th>
                    </tr>
                    <tr>
                      <th className="num">Ore lavorate</th>
                      <th className="num">Costo personale</th>
                      <th className="num">Ricavi passati</th>
                      <th className="num">Costi passati</th>
                      <th className="num">Utile consuntivato</th>
                      <th className="num">Ricavi futuri</th>
                      <th className="num">Ricavi anni successivi</th>
                      <th className="num">Costi futuri</th>
                      <th className="num">Ore future</th>
                      <th className="num">Ore restanti</th>
                      <th className="num">Costo personale futuro</th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo futuro da elaborare.">
                          Ricavo previsto
                        </span>
                      </th>
                      <th className="detail-kpi-percent-col">
                        <span className="detail-tooltip-label" title="% di sviluppo realizzata.">
                          % raggiunto
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo futuro attualizzato ad oggi secondo la percentuale della lavorazione realizzata.">
                          Ricavo maturato
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo storico + Ricavo maturato - Costo storico - Costo del personale.">
                          Utile ricalcolato
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Utile storico + Ricavi futuri complessivi - Costi futuri - Costo personale futuro.">
                          Utile fine progetto
                        </span>
                      </th>
                      <th className="detail-kpi-action-col">Salva</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`num ${detailConsuntivoMesePrecedente.oreLavorate < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.oreLavorate)}
                      </td>
                      <td className={`num ${detailConsuntivoMesePrecedente.costoPersonale < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.costoPersonale)}
                      </td>
                      <td className={`num ${detailConsuntivoMesePrecedente.ricavi < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.ricavi)}
                      </td>
                      <td className={`num ${detailCostiPassatiRiconciliati < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailCostiPassatiRiconciliati)}
                      </td>
                      <td className={`num ${detailUtileConsuntivatoRiconciliato < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileConsuntivatoRiconciliato)}
                      </td>
                      <td className={`num ${detailRicaviFuturiAggregati < 0 ? 'num-negative' : ''}`}>{formatNumber(detailRicaviFuturiAggregati)}</td>
                      <td className={`num ${detailRicaviAnniSuccessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailRicaviAnniSuccessivi)}</td>
                      <td className={`num ${detailCostiFuturiAggregati < 0 ? 'num-negative' : ''}`}>{formatNumber(detailCostiFuturiAggregati)}</td>
                      <td className={`num ${detailOreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(detailOreFuture)}</td>
                      <td className={`detail-kpi-amount-cell ${detailOreRestantiProiezione < 0 ? 'num-negative' : ''}`}>
                        <label className="detail-kpi-amount-input-wrap">
                          <input
                            className="detail-kpi-amount-input"
                            type="text"
                            inputMode="decimal"
                            value={detailOreRestantiInput}
                            onChange={handleDetailOreRestantiInputChange}
                            onBlur={handleDetailOreRestantiInputBlur}
                            aria-label="Ore restanti"
                          />
                          <span className="detail-kpi-amount-suffix">h</span>
                        </label>
                      </td>
                      <td className={`num ${detailCostoPersonaleFuturoProiezione < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailCostoPersonaleFuturoProiezione)}
                      </td>
                      <td className={`detail-kpi-amount-cell ${detailRicavoPrevisto < 0 ? 'num-negative' : ''}`}>
                        <label className="detail-kpi-amount-input-wrap">
                          <input
                            className="detail-kpi-amount-input"
                            type="text"
                            inputMode="decimal"
                            value={detailRicavoPrevistoInput}
                            onChange={handleDetailRicavoPrevistoInputChange}
                            onBlur={handleDetailRicavoPrevistoInputBlur}
                            aria-label="Ricavo previsto"
                          />
                          <span className="detail-kpi-amount-suffix">EUR</span>
                        </label>
                      </td>
                      <td className="detail-kpi-percent-cell">
                        <label className="detail-kpi-percent-input-wrap">
                          <input
                            className="detail-kpi-percent-input"
                            type="text"
                            inputMode="decimal"
                            value={detailPercentRaggiuntoInput}
                            onChange={handleDetailPercentRaggiuntoInputChange}
                            onBlur={handleDetailPercentRaggiuntoInputBlur}
                            aria-label="% raggiunto progetto"
                          />
                          <span className="detail-kpi-percent-suffix">%</span>
                        </label>
                      </td>
                      <td className={`num ${detailRicavoMaturatoAlMesePrecedente < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailRicavoMaturatoAlMesePrecedente)}
                      </td>
                      <td className={`num ${detailUtileRicalcolatoMesePrecedente < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileRicalcolatoMesePrecedente)}
                      </td>
                      <td className={`num ${detailUtileFineProgetto < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileFineProgetto)}
                      </td>
                      <td className="detail-kpi-action-cell">
                        <button
                          type="button"
                          onClick={handleSaveDetailPercentRaggiunto}
                          disabled={detailLoading || detailSaving || !detailData?.commessa}
                        >
                          {detailSaving ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            </section>

            <section className="detail-main-zone">
            <section className="detail-tabs-bar" aria-label="Navigazione dettaglio commessa">
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'storico' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('storico')}
              >
                Storico
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'dati-contabili' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('dati-contabili')}
              >
                Dati contabili
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'commerciale' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('commerciale')}
              >
                Commerciale
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'personale' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('personale')}
              >
                Personale
              </button>
            </section>
            <section className={`detail-grid-panels detail-grid-panels-tab-${detailActiveTab}`}>
              <section className={`panel detail-card detail-card-consuntivo ${detailActiveTab !== 'storico' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Consuntivo storico</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailSintesiRows.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun dato numerico disponibile per la commessa selezionata.</p>
                  )}

                  {detailSintesiRows.length > 0 && (
                    <table className="bonifici-table detail-numeri-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>Scenario</th>
                          <th className="num">Utile</th>
                          <th className="num">Ore Lavorate</th>
                          <th className="num">Costo Personale</th>
                          <th className="num">Ricavi</th>
                          <th className="num">Costi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailSintesiRows.map((row) => (
                          <tr key={row.key} className={row.isMonthRow ? 'detail-progressivo-row' : ''}>
                            <td>{row.anno}</td>
                            <td>{row.scenario}</td>
                            <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(row.utileSpecifico)}
                            </td>
                            <td className="num">{formatNumber(row.oreLavorate)}</td>
                            <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                            <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                            <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td colSpan={2} className="table-totals-label">Totale</td>
                          <td className={`num ${detailTotals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(detailTotals.utileSpecifico)}
                          </td>
                          <td className="num">{formatNumber(detailTotals.oreLavorate)}</td>
                          <td className={`num ${detailTotals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.costoPersonale)}</td>
                          <td className={`num ${detailTotals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.ricavi)}</td>
                          <td className={`num ${detailTotals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.costi)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-vendite ${detailActiveTab !== 'dati-contabili' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Vendite ordinate per data</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailVenditeSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessuna vendita disponibile per la commessa selezionata.</p>
                  )}

                  {detailVenditeSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>
                            <button type="button" className="sort-header-btn" onClick={toggleDetailVenditeDateSort}>
                              Data <span className="sort-indicator">{detailVenditeDateSortIndicator}</span>
                            </button>
                          </th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Causale</th>
                          <th>Sottoconto</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailVenditeSorted.map((row, index) => (
                          <tr key={`vendita-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td className={`num ${row.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importo)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.causale}</td>
                            <td>{row.sottoconto}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td className="table-totals-label">Totale</td>
                          <td className={`num ${detailVenditeTotaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(detailVenditeTotaleImporto)}</td>
                          <td colSpan={6} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-acquisti ${detailActiveTab !== 'dati-contabili' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Acquisti ordinati per data</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailAcquistiSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun acquisto disponibile per la commessa selezionata.</p>
                  )}

                  {detailAcquistiSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>
                            <button type="button" className="sort-header-btn" onClick={toggleDetailAcquistiDateSort}>
                              Data <span className="sort-indicator">{detailAcquistiDateSortIndicator}</span>
                            </button>
                          </th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Causale</th>
                          <th>Sottoconto</th>
                          <th>Controparte</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailAcquistiSorted.map((row, index) => (
                          <tr key={`acquisto-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td className={`num ${row.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importo)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.causale}</td>
                            <td>{row.sottoconto}</td>
                            <td>{row.controparte}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td className="table-totals-label">Totale</td>
                          <td className={`num ${detailAcquistiTotaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(detailAcquistiTotaleImporto)}</td>
                          <td colSpan={7} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-ordini ${detailActiveTab !== 'commerciale' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Ordini</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailOrdiniSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun ordine disponibile per la commessa selezionata.</p>
                  )}

                  {detailOrdiniSorted.length > 0 && (
                    <table className="bonifici-table detail-ordini-table">
                      <thead>
                        <tr>
                          <th>Protocollo</th>
                          <th>Stato</th>
                          <th>Posizione</th>
                          <th>Descrizione</th>
                          <th className="num">Quantita</th>
                          <th className="num">Prezzo Unit.</th>
                          <th className="num">Importo Ordine</th>
                          <th className="num">Qta originale</th>
                          <th className="num">Qta fatture</th>
                          <th className="num">% raggiung.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrdiniSorted.map((row) => {
                          const percentualeRiga = row.quantita <= 0 ? 0 : row.quantitaFatture / row.quantita
                          return (
                            <tr key={`ordine-${row.idDettaglioOrdine}`}>
                              <td>{row.protocollo}</td>
                              <td>{row.documentoStato}</td>
                              <td>{row.posizione}</td>
                              <td>{row.descrizione}</td>
                              <td className="num">{formatNumber(row.quantita)}</td>
                              <td className="num">{formatNumber(row.prezzoUnitario)}</td>
                              <td className={`num ${row.importoOrdine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoOrdine)}</td>
                              <td className="num">{formatNumber(row.quantitaOriginaleOrdinata)}</td>
                              <td className="num">{formatNumber(row.quantitaFatture)}</td>
                              <td className="num">{formatPercentRatio(percentualeRiga)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td colSpan={6} className="table-totals-label">Totale</td>
                          <td className={`num ${detailOrdiniAggregati.importoOrdinato < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(detailOrdiniAggregati.importoOrdinato)}
                          </td>
                          <td className="num">{formatNumber(detailOrdiniAggregati.quantitaOriginale)}</td>
                          <td className="num">{formatNumber(detailOrdiniAggregati.quantitaFatturata)}</td>
                          <td className="num">{formatPercentRatio(detailOrdiniPercentualeQuantita)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-offerte ${detailActiveTab !== 'commerciale' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Offerte</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailOfferteSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessuna offerta disponibile per la commessa selezionata.</p>
                  )}

                  {detailOfferteSorted.length > 0 && (
                    <table className="bonifici-table detail-offerte-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>Data</th>
                          <th>Protocollo</th>
                          <th>Oggetto</th>
                          <th>Stato</th>
                          <th className="num">Ricavo Previsto</th>
                          <th className="num">Costo Previsto</th>
                          <th className="num">Costo Prev. Personale</th>
                          <th className="num">Ore prev. offerta</th>
                          <th className="num">% Successo</th>
                          <th>Ordini collegati</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOfferteSorted.map((row, index) => (
                          <tr key={`offerta-${row.protocollo}-${index}`}>
                            <td>{row.anno ?? ''}</td>
                            <td>{formatDate(row.data)}</td>
                            <td>{row.protocollo}</td>
                            <td>{row.oggetto}</td>
                            <td>{row.documentoStato}</td>
                            <td className={`num ${row.ricavoPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoPrevisto)}</td>
                            <td className={`num ${row.costoPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevisto)}</td>
                            <td className={`num ${row.costoPrevistoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevistoPersonale)}</td>
                            <td className={`num ${row.orePrevisteOfferta < 0 ? 'num-negative' : ''}`}>{formatNumber(row.orePrevisteOfferta)}</td>
                            <td className="num">{formatPercentValue(row.percentualeSuccesso)}</td>
                            <td>{row.ordiniCollegati}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-percent ${detailActiveTab !== 'storico' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>% raggiungimento</h3>
                </header>
                <div className="detail-card-body detail-raggiungimento-body">
                  <div className="detail-avanzamento-box">
                    <p className="detail-kpi-caption">
                      Dati salvati in produzione.avanzamento (stessa data riferimento = sovrascrittura).
                    </p>

                    {detailAvanzamentoStorico.length === 0 && (
                      <p className="empty-state">Nessun avanzamento salvato disponibile per la commessa selezionata.</p>
                    )}

                    {detailAvanzamentoStorico.length > 0 && (
                      <table className="bonifici-table detail-avanzamento-table detail-avanzamento-grid-table">
                        <thead>
                          <tr>
                            <th>Data riferimento</th>
                            <th className="num">% raggiunto</th>
                            <th className="num">Importo riferimento</th>
                            <th className="num">Ore future</th>
                            <th className="num">Costo personale futuro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailAvanzamentoStorico.map((row) => (
                            <tr key={`avanzamento-${row.id}`}>
                              <td>{formatDate(row.dataRiferimento)}</td>
                              <td className="num">{formatPercentValue(row.percentualeRaggiunto)}</td>
                              <td className={`num ${row.importoRiferimento < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(row.importoRiferimento)}
                              </td>
                              <td className={`num ${(Number.isFinite(row.oreFuture) ? row.oreFuture : row.oreRestanti) < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(Number.isFinite(row.oreFuture) ? row.oreFuture : row.oreRestanti)}
                              </td>
                              <td className={`num ${row.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(row.costoPersonaleFuturo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>

              <section className={`panel detail-card detail-card-requisiti ${detailActiveTab !== 'personale' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Ore requisiti commessa</h3>
                </header>
                <div className="detail-card-body">
                  <p className="detail-kpi-caption">
                    Speso attivita fino al {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : '-'}.
                  </p>

                  {detailRequisitiOreRows.length === 0 && (
                    <p className="empty-state">
                      Nessun requisito con ore previste/spese disponibile per la commessa selezionata.
                    </p>
                  )}

                  {detailRequisitiOreRows.length > 0 && (
                    <>
                      <div className="detail-requisiti-split">
                        <div className="detail-requisiti-col">
                          <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                            <table className="bonifici-table detail-requisiti-table">
                              <thead>
                                <tr>
                                  <th>Requisito</th>
                                  <th className="num">Durata requisito</th>
                                  <th className="num">Ore Previste</th>
                                  <th className="num">Ore Spese</th>
                                  <th className="num">Ore Restanti</th>
                                  <th className="num">% Avanzamento</th>
                                  <th>Dettaglio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRequisitiOreRows.map((row) => {
                                  const isExpanded = selectedRequisitoId === row.idRequisito
                                  const risorseRows = isExpanded
                                    ? detailRequisitiOreRisorseRows.filter((item) => item.idRequisito === row.idRequisito)
                                    : []
                                  const risorseTotals = risorseRows.reduce((acc, item) => ({
                                    orePreviste: acc.orePreviste + item.orePreviste,
                                    oreSpese: acc.oreSpese + item.oreSpese,
                                    oreRestanti: acc.oreRestanti + item.oreRestanti,
                                  }), {
                                    orePreviste: 0,
                                    oreSpese: 0,
                                    oreRestanti: 0,
                                  })

                                  return (
                                    <Fragment key={`requisito-${row.idRequisito}`}>
                                      <tr>
                                        <td>{row.requisito || `Requisito ${row.idRequisito}`}</td>
                                        <td className="num">{formatNumber(row.durataRequisito)}</td>
                                        <td className="num">{formatNumber(row.orePreviste)}</td>
                                        <td className="num">{formatNumber(row.oreSpese)}</td>
                                        <td className={`num ${row.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                          {formatNumber(row.oreRestanti)}
                                        </td>
                                        <td className="num">{formatPercentRatio(row.percentualeAvanzamento)}</td>
                                        <td>
                                          <button
                                            type="button"
                                            className="ghost-button detail-inline-action"
                                            onClick={() => toggleRequisitoDettaglio(row.idRequisito)}
                                          >
                                            {isExpanded ? 'Nascondi' : 'Vedi'}
                                          </button>
                                        </td>
                                      </tr>

                                      {isExpanded && (
                                        <tr className="detail-requisito-expand-row">
                                          <td colSpan={7}>
                                            {risorseRows.length === 0 && (
                                              <p className="empty-state">Nessun dettaglio risorsa disponibile per il requisito selezionato.</p>
                                            )}
                                            {risorseRows.length > 0 && (
                                              <div className="detail-requisiti-dettaglio">
                                                <table className="bonifici-table detail-requisiti-table detail-requisiti-table-inline">
                                                  <thead>
                                                    <tr>
                                                      <th>Risorsa</th>
                                                      <th className="num">Durata requisito</th>
                                                      <th className="num">Ore Previste</th>
                                                      <th className="num">Ore Spese</th>
                                                      <th className="num">Ore Restanti</th>
                                                      <th className="num">% Avanzamento</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {risorseRows.map((item) => (
                                                      <tr key={`requisito-risorsa-${item.idRequisito}-${item.idRisorsa}`}>
                                                        <td>{item.nomeRisorsa || `ID ${item.idRisorsa}`}</td>
                                                        <td className="num">{formatNumber(item.durataRequisito)}</td>
                                                        <td className="num">{formatNumber(item.orePreviste)}</td>
                                                        <td className="num">{formatNumber(item.oreSpese)}</td>
                                                        <td className={`num ${item.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                                          {formatNumber(item.oreRestanti)}
                                                        </td>
                                                        <td className="num">{formatPercentRatio(item.percentualeAvanzamento)}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                  <tfoot>
                                                    <tr className="table-totals-row">
                                                      <td className="table-totals-label">Totale requisito</td>
                                                      <td className="num">{formatNumber(row.durataRequisito)}</td>
                                                      <td className="num">{formatNumber(risorseTotals.orePreviste)}</td>
                                                      <td className="num">{formatNumber(risorseTotals.oreSpese)}</td>
                                                      <td className={`num ${risorseTotals.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                                        {formatNumber(risorseTotals.oreRestanti)}
                                                      </td>
                                                      <td className="num">
                                                        {formatPercentRatio(
                                                          (risorseTotals.orePreviste > 0 ? risorseTotals.orePreviste : row.durataRequisito) > 0
                                                            ? risorseTotals.oreSpese / (risorseTotals.orePreviste > 0 ? risorseTotals.orePreviste : row.durataRequisito)
                                                            : 0,
                                                        )}
                                                      </td>
                                                    </tr>
                                                  </tfoot>
                                                </table>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  )
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="table-totals-row">
                                  <td className="table-totals-label">Totale</td>
                                  <td className="num">{formatNumber(detailRequisitiOreTotals.durataRequisito)}</td>
                                  <td className="num">{formatNumber(detailRequisitiOreTotals.orePreviste)}</td>
                                  <td className="num">{formatNumber(detailRequisitiOreTotals.oreSpese)}</td>
                                  <td className={`num ${detailRequisitiOreTotals.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                    {formatNumber(detailRequisitiOreTotals.oreRestanti)}
                                  </td>
                                  <td className="num">
                                    {formatPercentRatio(
                                      detailRequisitiOreTotals.oreRiferimento > 0
                                        ? detailRequisitiOreTotals.oreSpese / detailRequisitiOreTotals.oreRiferimento
                                        : 0,
                                    )}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        <div className="detail-requisiti-col">
                          <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                            <table className="bonifici-table detail-requisiti-table">
                              <thead>
                                <tr>
                                  <th>Risorsa</th>
                                  <th className="num">Ore spese totali</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailOreSpeseRisorseRows.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="empty-state">Nessun dato ore spese per risorsa.</td>
                                  </tr>
                                )}
                                {detailOreSpeseRisorseRows.map((row) => (
                                  <tr key={`ore-spese-risorsa-${row.idRisorsa}`}>
                                    <td>{row.nomeRisorsa || `ID ${row.idRisorsa}`}</td>
                                    <td className={`num ${row.oreSpeseTotali < 0 ? 'num-negative' : ''}`}>{formatNumber(row.oreSpeseTotali)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="table-totals-row">
                                  <td className="table-totals-label">Totale</td>
                                  <td className={`num ${detailOreSpeseRisorseTotal < 0 ? 'num-negative' : ''}`}>{formatNumber(detailOreSpeseRisorseTotal)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </section>
            </section>
          </section>
  )
}
