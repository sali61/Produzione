// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

type AppTopBarProps = any

export function AppTopBar(props: AppTopBarProps) {
  const {
    apiHealth,
    appVersion,
    canAccessAnalisiAlberoProiezioniPage,
    canAccessAnalisiCommesseMenu,
    canAccessAnalisiDettaglioFatturatoPage,
    canAccessAnalisiPianoFatturazionePage,
    canAccessAnalisiProiezioniMenu,
    canAccessAnalisiBuPage,
    canAccessAnalisiBurccPage,
    canAccessAnalisiRccPage,
    canAccessDatiContabiliMenu,
    canAccessPrevisioniMenu,
    canAccessPrevisioniFunnelBuPage,
    canAccessPrevisioniFunnelBurccPage,
    canAccessPrevisioniFunnelRccPage,
    canAccessPrevisioniUtileMensileBuPage,
    canAccessPrevisioniUtileMensileRccPage,
    canAccessProcessoOffertaPage,
    canAccessRisultatiRisorseMenu,
    canImpersonate,
    currentProfile,
    handleLogout,
    handleOpenAppInfo,
    handleOpenImpersonation,
    handleOpenInfo,
    isImpersonating,
    onProfileChange,
    openMenu,
    profiles,
    sessionLoading,
    stopImpersonation,
    toggleMenu,
    user,
    activateAnalisiBuPivotFatturatoPage,
    activateAnalisiBuRisultatoMensilePage,
    activateAnalisiAlberoProiezioniPage,
    activateAnalisiBurccPivotFatturatoPage,
    activateAnalisiBurccRisultatoMensilePage,
    activateAnalisiDettaglioFatturatoPage,
    activateAnalisiPianoFatturazionePage,
    activateAnalisiRccPivotFatturatoPage,
    activateAnalisiRccRisultatoMensilePage,
    activateCommesseAndamentoMensilePage,
    activateCommesseKpiPage,
    activateCommesseAnomalePage,
    activateCommesseDatiAnnualiAggregatiPage,
    activateCommesseSegnalazioniPage,
    activateDatiContabiliAcquistiPage,
    activateDatiContabiliVenditaPage,
    activatePrevisioniFunnelPage,
    activatePrevisioniReportFunnelBuPage,
    activatePrevisioniReportFunnelBurccPage,
    activatePrevisioniReportFunnelRccPage,
    activatePrevisioniUtileMensileBuPage,
    activatePrevisioniUtileMensileRccPage,
    activateProcessoOffertaIncidenzaBuPage,
    activateProcessoOffertaIncidenzaRccPage,
    activateProcessoOffertaOffertePage,
    activateProcessoOffertaPercentualeSuccessoBuPage,
    activateProcessoOffertaPercentualeSuccessoRccPage,
    activateProcessoOffertaSintesiBuPage,
    activateProcessoOffertaSintesiRccPage,
    activateProdottiPage,
    activateRisorseOuRisorseMensilePage,
    activateRisorseOuRisorseMensilePivotPage,
    activateRisorseOuRisorsePage,
    activateRisorseOuRisorsePivotPage,
    activateRisorseRisultatiMensilePage,
    activateRisorseRisultatiMensilePivotPage,
    activateRisorseRisultatiPage,
    activateRisorseRisultatiPivotPage,
    activateSintesiPage,
  } = props as any

  return (
    <header className="top-bar">
      <div className="brand-area">
        <div className="brand">Produzione</div>
        <p className="brand-subtitle">SSO centralizzato con Auth</p>
      </div>

      <nav className="menu main-nav" aria-label="Menu applicativo">
        {canAccessAnalisiCommesseMenu && (
          <div className={`menu-dropdown ${openMenu === 'sintesi' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('sintesi')}
              aria-expanded={openMenu === 'sintesi'}
            >
              Analisi Commesse
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateSintesiPage}>
                Commesse
              </button>
              <button type="button" className="menu-action" onClick={activateProdottiPage}>
                Prodotti
              </button>
              <button type="button" className="menu-action" onClick={activateCommesseAndamentoMensilePage}>
                Andamento Mensile
              </button>
              <button type="button" className="menu-action" onClick={activateCommesseKpiPage}>
                KPI Commesse
              </button>
              <button type="button" className="menu-action" onClick={activateCommesseDatiAnnualiAggregatiPage}>
                Dati Annuali Aggregati
              </button>
              {canAccessPrevisioniUtileMensileRccPage && (
                <button type="button" className="menu-action" onClick={activatePrevisioniUtileMensileRccPage}>
                  Utile Mensile RCC
                </button>
              )}
              {canAccessPrevisioniUtileMensileBuPage && (
                <button type="button" className="menu-action" onClick={activatePrevisioniUtileMensileBuPage}>
                  Utile Mensile BU
                </button>
              )}
              <button type="button" className="menu-action" onClick={activateCommesseAnomalePage}>
                Commesse Anomale
              </button>
              <button type="button" className="menu-action" onClick={activateCommesseSegnalazioniPage}>
                Segnalazioni
              </button>
            </div>
          </div>
        )}
        {canAccessRisultatiRisorseMenu && (
          <div className={`menu-dropdown ${openMenu === 'risorse' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('risorse')}
              aria-expanded={openMenu === 'risorse'}
            >
              Analisi Risorse
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateRisorseRisultatiPage}>
                Valutazione Annuale
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseRisultatiPivotPage}>
                Pivot Annuale
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseRisultatiMensilePage}>
                Valutazione Mensile
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseRisultatiMensilePivotPage}>
                Pivot Mensile
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseOuRisorsePage}>
                Analisi OU Risorse
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseOuRisorsePivotPage}>
                Analisi OU Risorse Pivot
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseOuRisorseMensilePage}>
                Analisi Mensile OU Risorse
              </button>
              <button type="button" className="menu-action" onClick={activateRisorseOuRisorseMensilePivotPage}>
                Analisi Mensile OU Risorse Pivot
              </button>
            </div>
          </div>
        )}
        {canAccessAnalisiProiezioniMenu && (
          <div className={`menu-dropdown ${openMenu === 'analisi-proiezioni' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('analisi-proiezioni')}
              aria-expanded={openMenu === 'analisi-proiezioni'}
            >
              Analisi Proiezioni
            </button>
            <div className="menu-dropdown-panel">
              {canAccessAnalisiRccPage && (
                <>
                  <button type="button" className="menu-action" onClick={activateAnalisiRccRisultatoMensilePage}>
                    Proiezione Mensile RCC
                  </button>
                  <button type="button" className="menu-action" onClick={activateAnalisiRccPivotFatturatoPage}>
                    Report Annuale RCC
                  </button>
                </>
              )}
              {canAccessAnalisiBuPage && (
                <>
                  <button type="button" className="menu-action" onClick={activateAnalisiBuRisultatoMensilePage}>
                    Proiezione Mensile BU
                  </button>
                  <button type="button" className="menu-action" onClick={activateAnalisiBuPivotFatturatoPage}>
                    Report Annuale BU
                  </button>
                </>
              )}
              {canAccessAnalisiBurccPage && (
                <>
                  <button type="button" className="menu-action" onClick={activateAnalisiBurccRisultatoMensilePage}>
                    Proiezione Mensile RCC-BU
                  </button>
                  <button type="button" className="menu-action" onClick={activateAnalisiBurccPivotFatturatoPage}>
                    Report Annuale RCC-BU
                  </button>
                </>
              )}
              {canAccessAnalisiPianoFatturazionePage && (
                <button type="button" className="menu-action" onClick={activateAnalisiPianoFatturazionePage}>
                  Piano Fatturazione
                </button>
              )}
              {canAccessAnalisiAlberoProiezioniPage && (
                <button type="button" className="menu-action" onClick={activateAnalisiAlberoProiezioniPage}>
                  Albero Proiezioni
                </button>
              )}
              {canAccessAnalisiDettaglioFatturatoPage && (
                <button type="button" className="menu-action" onClick={activateAnalisiDettaglioFatturatoPage}>
                  Dettaglio Fatturato
                </button>
              )}
            </div>
          </div>
        )}
        {canAccessPrevisioniMenu && (
          <div className={`menu-dropdown ${openMenu === 'previsioni' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('previsioni')}
              aria-expanded={openMenu === 'previsioni'}
            >
              Previsioni
            </button>
            <div className="menu-dropdown-panel">
              {canAccessPrevisioniFunnelRccPage && (
                <>
                  <button type="button" className="menu-action" onClick={activatePrevisioniFunnelPage}>
                    Funnel
                  </button>
                  <button type="button" className="menu-action" onClick={activatePrevisioniReportFunnelRccPage}>
                    Report Funnel RCC
                  </button>
                </>
              )}
              {canAccessPrevisioniFunnelBuPage && (
                <button type="button" className="menu-action" onClick={activatePrevisioniReportFunnelBuPage}>
                  Report Funnel BU
                </button>
              )}
              {canAccessPrevisioniFunnelBurccPage && (
                <button type="button" className="menu-action" onClick={activatePrevisioniReportFunnelBurccPage}>
                  Report Funnel BU RCC
                </button>
              )}
            </div>
          </div>
        )}
        {canAccessProcessoOffertaPage && (
          <div className={`menu-dropdown ${openMenu === 'processo-offerta' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('processo-offerta')}
              aria-expanded={openMenu === 'processo-offerta'}
            >
              Processo Offerta
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateProcessoOffertaOffertePage}>
                Offerte
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaSintesiRccPage}>
                Sintesi RCC
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaSintesiBuPage}>
                Sintesi BU
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaPercentualeSuccessoRccPage}>
                Percentuale Successo RCC
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaPercentualeSuccessoBuPage}>
                Percentuale Successo BU
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaIncidenzaRccPage}>
                Incidenza RCC
              </button>
              <button type="button" className="menu-action" onClick={activateProcessoOffertaIncidenzaBuPage}>
                Incidenza BU
              </button>
            </div>
          </div>
        )}
        {canAccessDatiContabiliMenu && (
          <div className={`menu-dropdown ${openMenu === 'dati-contabili' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('dati-contabili')}
              aria-expanded={openMenu === 'dati-contabili'}
            >
              Dati Contabili
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateDatiContabiliVenditaPage}>
                Vendite
              </button>
              <button type="button" className="menu-action" onClick={activateDatiContabiliAcquistiPage}>
                Acquisti
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="top-actions">
        {profiles.length > 0 && (
          <label className="context-switcher" htmlFor="context-switcher-profile">
            <span>Profilo</span>
            <select
              id="context-switcher-profile"
              value={currentProfile}
              onChange={(event) => onProfileChange(event.target.value)}
            >
              {profiles.map((profile: string) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className={`status-badge ${apiHealth === 'OK' ? 'ok' : 'ko'}`}>
          API: {apiHealth}
        </div>
        <div className="status-badge neutral">
          Ver: {appVersion}
        </div>

        {user && (
          <div className={`menu-dropdown menu-dropdown-right ${openMenu === 'user' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger user-menu-trigger"
              onClick={() => toggleMenu('user')}
              aria-expanded={openMenu === 'user'}
            >
              <strong>{user.authenticatedUsername || user.username}</strong>
              <span>{isImpersonating ? 'impersona' : 'login'}</span>
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={handleOpenInfo}>
                Info
              </button>
              <button type="button" className="menu-action" onClick={handleOpenAppInfo}>
                Info applicazione
              </button>
              {canImpersonate && (
                <button type="button" className="menu-action" onClick={handleOpenImpersonation}>
                  Impersonifica
                </button>
              )}
              {isImpersonating && (
                <button
                  type="button"
                  className="menu-action"
                  onClick={() => void stopImpersonation()}
                  disabled={sessionLoading}
                >
                  {sessionLoading ? 'Attendi...' : 'Termina impersonificazione'}
                </button>
              )}
              <button type="button" className="menu-action" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
