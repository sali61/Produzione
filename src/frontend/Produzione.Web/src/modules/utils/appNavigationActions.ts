// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

export function buildAppNavigationActions(ctx: any) {
  const {
    activeImpersonation,
    activePage,
    canImpersonate,
    clearSession,
    commesseAndamentoMensileAnni,
    commesseDatiAnnualiAvailableSelection,
    commesseDatiAnnualiSelectedSelection,
    currentProfile,
    ensureSession,
    getDefaultReferenceMonth,
    impersonationInput,
    isRisorseMensilePage,
    isRisorsePage,
    loadAnalisiBuPivotFatturato,
    loadAnalisiBuRisultatoMensile,
    loadAnalisiAlberoProiezioni,
    loadAnalisiBurccPivotFatturato,
    loadAnalisiBurccRisultatoMensile,
    loadAnalisiDettaglioFatturato,
    loadAnalisiPianoFatturazione,
    loadAnalisiRccPivotFatturato,
    loadAnalisiRccRisultatoMensile,
    loadCommesseAndamentoMensile,
    loadCommesseAnomale,
    loadCommesseDatiAnnualiAggregati,
    loadPrevisioniFunnel,
    loadPrevisioniReportFunnelBu,
    loadPrevisioniReportFunnelBurcc,
    loadPrevisioniReportFunnelRcc,
    loadPrevisioniUtileMensileBu,
    loadPrevisioniUtileMensileRcc,
    loadProcessoOffertaOfferte,
    loadProcessoOffertaSintesiBu,
    loadProcessoOffertaSintesiRcc,
    loadRisorseFilters,
    loadRisorseValutazione,
    loadSintesiFilters,
    redirectGuardKey,
    redirectToCentralAuth,
    risorseFiltersForm,
    risorsePivotAvailableSelection,
    risorsePivotSelectedSelection,
    setActivePage,
    setCollapsedProductKeys,
    setCommesseDatiAnnualiAvailableSelection,
    setCommesseDatiAnnualiSelectedFields,
    setCommesseDatiAnnualiSelectedSelection,
    setCommessaSearch,
    setImpersonationInput,
    setImpersonationModalOpen,
    setInfoModalOpen,
    setLastSintesiPage,
    setOpenMenu,
    setPrevisioniUtileMensileBu,
    setPrevisioniUtileMensileBuAnno,
    setPrevisioniUtileMensileBuMeseRiferimento,
    setPrevisioniUtileMensileBuProduzione,
    setPrevisioniUtileMensileRcc,
    setPrevisioniUtileMensileRccAnno,
    setPrevisioniUtileMensileRccMeseRiferimento,
    setPrevisioniUtileMensileRccProduzione,
    setProcessoOffertaEsiti,
    setRisorsePivotAvailableSelection,
    setRisorsePivotSelectedFields,
    setRisorsePivotSelectedSelection,
    setSortColumn,
    setSortDirection,
    setStatusMessage,
    setAppInfoModalOpen,
    sintesiFiltersForm,
    token,
  } = ctx

  const activateSintesiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-sintesi')
    setSortColumn('commessa')
    setSortDirection('asc')
    setCollapsedProductKeys([])
    setActivePage('commesse-sintesi')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const activateCommesseAndamentoMensilePage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-andamento-mensile')
    setActivePage('commesse-andamento-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, commesseAndamentoMensileAnni, 'commesse')
    void loadCommesseAndamentoMensile()
  }

  const activateCommesseAnomalePage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-anomale')
    setActivePage('commesse-anomale')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadCommesseAnomale()
  }

  const activateCommesseDatiAnnualiAggregatiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-dati-annuali-aggregati')
    setActivePage('commesse-dati-annuali-aggregati')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, [], 'commesse')
    void loadCommesseDatiAnnualiAggregati()
  }

  const addCommesseDatiAnnualiSelectedFields = () => {
    if (commesseDatiAnnualiAvailableSelection.length === 0) {
      return
    }

    setCommesseDatiAnnualiSelectedFields((current: string[]) => {
      const next = [...current]
      commesseDatiAnnualiAvailableSelection.forEach((field: string) => {
        if (!next.includes(field)) {
          next.push(field)
        }
      })
      return next
    })
    setCommesseDatiAnnualiSelectedSelection(commesseDatiAnnualiAvailableSelection)
    setCommesseDatiAnnualiAvailableSelection([])
  }

  const removeCommesseDatiAnnualiSelectedFields = () => {
    if (commesseDatiAnnualiSelectedSelection.length === 0) {
      return
    }

    setCommesseDatiAnnualiSelectedFields((current: string[]) => (
      current.filter((field) => !commesseDatiAnnualiSelectedSelection.includes(field))
    ))
    setCommesseDatiAnnualiAvailableSelection(commesseDatiAnnualiSelectedSelection)
    setCommesseDatiAnnualiSelectedSelection([])
  }

  const moveCommesseDatiAnnualiField = (direction: 'up' | 'down') => {
    if (commesseDatiAnnualiSelectedSelection.length !== 1) {
      return
    }

    const movingField = commesseDatiAnnualiSelectedSelection[0]
    setCommesseDatiAnnualiSelectedFields((current: string[]) => {
      const index = current.indexOf(movingField)
      if (index < 0) {
        return current
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const addRisorsePivotSelectedFields = () => {
    if (risorsePivotAvailableSelection.length === 0) {
      return
    }

    setRisorsePivotSelectedFields((current: string[]) => {
      const next = [...current]
      risorsePivotAvailableSelection.forEach((field: string) => {
        if (!next.includes(field)) {
          next.push(field)
        }
      })
      return next
    })
    setRisorsePivotSelectedSelection(risorsePivotAvailableSelection)
    setRisorsePivotAvailableSelection([])
  }

  const removeRisorsePivotSelectedFields = () => {
    if (risorsePivotSelectedSelection.length === 0) {
      return
    }

    setRisorsePivotSelectedFields((current: string[]) => (
      current.filter((field) => !risorsePivotSelectedSelection.includes(field))
    ))
    setRisorsePivotAvailableSelection(risorsePivotSelectedSelection)
    setRisorsePivotSelectedSelection([])
  }

  const moveRisorsePivotField = (direction: 'up' | 'down') => {
    if (risorsePivotSelectedSelection.length !== 1) {
      return
    }

    const movingField = risorsePivotSelectedSelection[0]
    setRisorsePivotSelectedFields((current: string[]) => {
      const index = current.indexOf(movingField)
      if (index < 0) {
        return current
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const activateRisorsePage = (page: string, mensile: boolean, analisiOu = false, analisiOuPivot = false) => {
    setOpenMenu(null)
    setActivePage(page)
    if (!token.trim() || !currentProfile) {
      return
    }

    const yearsToRequest = mensile
      ? (
        risorseFiltersForm.anni.length > 0
          ? risorseFiltersForm.anni
          : [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()]
      )
      : []

    void loadRisorseFilters(mensile, yearsToRequest, analisiOu, analisiOuPivot).then((ok: boolean) => {
      if (ok) {
        void loadRisorseValutazione(mensile, analisiOu, analisiOuPivot)
      }
    })
  }

  const activateProdottiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('prodotti-sintesi')
    setSortColumn('prodotto')
    setSortDirection('asc')
    setCollapsedProductKeys([])
    setActivePage('prodotti-sintesi')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'prodotti')
  }

  const activateRisorseRisultatiPage = () => {
    activateRisorsePage('risorse-risultati', false)
  }

  const activateRisorseRisultatiPivotPage = () => {
    activateRisorsePage('risorse-risultati-pivot', false)
  }

  const activateRisorseRisultatiMensilePage = () => {
    activateRisorsePage('risorse-risultati-mensile', true)
  }

  const activateRisorseRisultatiMensilePivotPage = () => {
    activateRisorsePage('risorse-risultati-mensile-pivot', true)
  }

  const activateRisorseOuRisorsePage = () => {
    activateRisorsePage('risorse-ou-risorse', false, true, false)
  }

  const activateRisorseOuRisorsePivotPage = () => {
    activateRisorsePage('risorse-ou-risorse-pivot', false, true, false)
  }

  const activateRisorseOuRisorseMensilePage = () => {
    activateRisorsePage('risorse-ou-risorse-mensile', true, true, false)
  }

  const activateRisorseOuRisorseMensilePivotPage = () => {
    activateRisorsePage('risorse-ou-risorse-mensile-pivot', true, true, false)
  }

  const activateAnalisiRccRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-rcc-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiRccRisultatoMensile()
  }

  const activateAnalisiRccPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-rcc-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiRccPivotFatturato()
  }

  const activateAnalisiBuRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-bu-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBuRisultatoMensile()
  }

  const activateAnalisiBuPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-bu-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBuPivotFatturato()
  }

  const activateAnalisiBurccRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-burcc-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBurccRisultatoMensile()
  }

  const activateAnalisiBurccPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-burcc-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBurccPivotFatturato()
  }

  const activateAnalisiPianoFatturazionePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-piano-fatturazione')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiPianoFatturazione()
  }

  const activateAnalisiAlberoProiezioniPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-albero-proiezioni')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiAlberoProiezioni()
  }

  const activateAnalisiDettaglioFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-dettaglio-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiDettaglioFatturato()
  }

  const activatePrevisioniFunnelPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-funnel')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniFunnel()
  }

  const activatePrevisioniReportFunnelRccPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-report-funnel-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniReportFunnelRcc()
  }

  const activatePrevisioniReportFunnelBuPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-report-funnel-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniReportFunnelBu()
  }

  const activatePrevisioniReportFunnelBurccPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-report-funnel-burcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniReportFunnelBurcc()
  }

  const activatePrevisioniUtileMensileRccPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-utile-mensile-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniUtileMensileRcc()
  }

  const activatePrevisioniUtileMensileBuPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-utile-mensile-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniUtileMensileBu()
  }

  const activateProcessoOffertaOffertePage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-offerte')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaOfferte()
  }

  const activateProcessoOffertaSintesiRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-sintesi-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaSintesiBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-sintesi-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateProcessoOffertaPercentualeSuccessoRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-percentuale-successo-rcc')
    setProcessoOffertaEsiti([])
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaPercentualeSuccessoBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-percentuale-successo-bu')
    setProcessoOffertaEsiti([])
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateProcessoOffertaIncidenzaRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-incidenza-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaIncidenzaBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-incidenza-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateDatiContabiliVenditaPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('dati-contabili-vendita')
    setActivePage('dati-contabili-vendita')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const activateDatiContabiliAcquistiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('dati-contabili-acquisti')
    setActivePage('dati-contabili-acquisti')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const handleSintesiSubmit = (event: any) => {
    event.preventDefault()
    if (activePage === 'dati-contabili-vendita') {
      void ctx.executeDatiContabiliVenditaSearch()
      return
    }
    if (activePage === 'dati-contabili-acquisti') {
      void ctx.executeDatiContabiliAcquistiSearch()
      return
    }

    void ctx.executeSintesiSearch()
  }

  const handleAnalisiSubmit = (event: any) => {
    event.preventDefault()
    if (isRisorsePage) {
      void loadRisorseValutazione(isRisorseMensilePage)
      return
    }

    if (activePage === 'commesse-andamento-mensile') {
      void loadCommesseAndamentoMensile()
      return
    }

    if (activePage === 'commesse-anomale') {
      void loadCommesseAnomale()
      return
    }

    if (activePage === 'commesse-dati-annuali-aggregati') {
      void loadCommesseDatiAnnualiAggregati()
      return
    }

    if (activePage === 'processo-offerta-offerte') {
      void loadProcessoOffertaOfferte()
      return
    }

    if (
      activePage === 'processo-offerta-sintesi-rcc' ||
      activePage === 'processo-offerta-percentuale-successo-rcc' ||
      activePage === 'processo-offerta-incidenza-rcc'
    ) {
      void loadProcessoOffertaSintesiRcc()
      return
    }

    if (
      activePage === 'processo-offerta-sintesi-bu' ||
      activePage === 'processo-offerta-percentuale-successo-bu' ||
      activePage === 'processo-offerta-incidenza-bu'
    ) {
      void loadProcessoOffertaSintesiBu()
      return
    }

    if (activePage === 'previsioni-report-funnel-rcc') {
      void loadPrevisioniReportFunnelRcc()
      return
    }

    if (activePage === 'previsioni-report-funnel-bu') {
      void loadPrevisioniReportFunnelBu()
      return
    }

    if (activePage === 'previsioni-report-funnel-burcc') {
      void loadPrevisioniReportFunnelBurcc()
      return
    }

    if (activePage === 'previsioni-utile-mensile-rcc') {
      void loadPrevisioniUtileMensileRcc()
      return
    }

    if (activePage === 'previsioni-utile-mensile-bu') {
      void loadPrevisioniUtileMensileBu()
      return
    }

    if (activePage === 'previsioni-funnel') {
      void loadPrevisioniFunnel()
      return
    }

    if (activePage === 'analisi-rcc-pivot-fatturato') {
      void loadAnalisiRccPivotFatturato()
      return
    }

    if (activePage === 'analisi-bu-pivot-fatturato') {
      void loadAnalisiBuPivotFatturato()
      return
    }

    if (activePage === 'analisi-burcc-pivot-fatturato') {
      void loadAnalisiBurccPivotFatturato()
      return
    }

    if (activePage === 'analisi-bu-risultato-mensile') {
      void loadAnalisiBuRisultatoMensile()
      return
    }

    if (activePage === 'analisi-burcc-risultato-mensile') {
      void loadAnalisiBurccRisultatoMensile()
      return
    }

    if (activePage === 'analisi-piano-fatturazione') {
      void loadAnalisiPianoFatturazione()
      return
    }

    if (activePage === 'analisi-albero-proiezioni') {
      void loadAnalisiAlberoProiezioni()
      return
    }

    if (activePage === 'analisi-dettaglio-fatturato') {
      void loadAnalisiDettaglioFatturato()
      return
    }

    void loadAnalisiRccRisultatoMensile()
  }

  const applyImpersonation = async (event: any) => {
    event.preventDefault()

    const requested = impersonationInput.trim()
    if (!requested) {
      setStatusMessage('Inserisci lo username da impersonificare.')
      return
    }

    if (!token.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setStatusMessage(`Verifica impersonificazione utente "${requested}"...`)
    const ok = await ensureSession(token, 'stale_token', requested)
    if (!ok) {
      return
    }

    setImpersonationModalOpen(false)
    setOpenMenu(null)
  }

  const stopImpersonation = async () => {
    if (!token.trim()) {
      return
    }

    setStatusMessage('Rimozione impersonificazione in corso...')
    const ok = await ensureSession(token, 'stale_token', '')
    if (!ok) {
      return
    }

    setImpersonationInput('')
    setImpersonationModalOpen(false)
    setOpenMenu(null)
    setStatusMessage('Impersonificazione terminata. Contesto personale ripristinato.')
  }

  const handleOpenInfo = () => {
    setOpenMenu(null)
    setAppInfoModalOpen(false)
    setInfoModalOpen(true)
  }

  const handleOpenAppInfo = () => {
    setOpenMenu(null)
    setInfoModalOpen(false)
    setAppInfoModalOpen(true)
    void ctx.loadAppInfoDescriptions()
  }

  const handleOpenImpersonation = () => {
    if (!canImpersonate) {
      return
    }

    setImpersonationInput(activeImpersonation || '')
    setOpenMenu(null)
    setImpersonationModalOpen(true)
  }

  const handleLogout = () => {
    setOpenMenu(null)
    setInfoModalOpen(false)
    setAppInfoModalOpen(false)
    setImpersonationModalOpen(false)
    clearSession()
    sessionStorage.removeItem(redirectGuardKey)
    setStatusMessage('Logout locale eseguito.')
    redirectToCentralAuth('logout')
  }

  const toggleMenu = (menu: string) => {
    setOpenMenu((current: string | null) => (current === menu ? null : menu))
  }

  return {
    activateSintesiPage,
    activateCommesseAndamentoMensilePage,
    activateCommesseAnomalePage,
    activateCommesseDatiAnnualiAggregatiPage,
    addCommesseDatiAnnualiSelectedFields,
    removeCommesseDatiAnnualiSelectedFields,
    moveCommesseDatiAnnualiField,
    addRisorsePivotSelectedFields,
    removeRisorsePivotSelectedFields,
    moveRisorsePivotField,
    activateRisorsePage,
    activateProdottiPage,
    activateRisorseRisultatiPage,
    activateRisorseRisultatiPivotPage,
    activateRisorseRisultatiMensilePage,
    activateRisorseRisultatiMensilePivotPage,
    activateRisorseOuRisorsePage,
    activateRisorseOuRisorsePivotPage,
    activateRisorseOuRisorseMensilePage,
    activateRisorseOuRisorseMensilePivotPage,
    activateAnalisiRccRisultatoMensilePage,
    activateAnalisiRccPivotFatturatoPage,
    activateAnalisiBuRisultatoMensilePage,
    activateAnalisiBuPivotFatturatoPage,
    activateAnalisiBurccRisultatoMensilePage,
    activateAnalisiBurccPivotFatturatoPage,
    activateAnalisiPianoFatturazionePage,
    activateAnalisiAlberoProiezioniPage,
    activateAnalisiDettaglioFatturatoPage,
    activatePrevisioniFunnelPage,
    activatePrevisioniReportFunnelRccPage,
    activatePrevisioniReportFunnelBuPage,
    activatePrevisioniReportFunnelBurccPage,
    activatePrevisioniUtileMensileRccPage,
    activatePrevisioniUtileMensileBuPage,
    activateProcessoOffertaOffertePage,
    activateProcessoOffertaSintesiRccPage,
    activateProcessoOffertaSintesiBuPage,
    activateProcessoOffertaPercentualeSuccessoRccPage,
    activateProcessoOffertaPercentualeSuccessoBuPage,
    activateProcessoOffertaIncidenzaRccPage,
    activateProcessoOffertaIncidenzaBuPage,
    activateDatiContabiliVenditaPage,
    activateDatiContabiliAcquistiPage,
    handleSintesiSubmit,
    handleAnalisiSubmit,
    applyImpersonation,
    stopImpersonation,
    handleOpenInfo,
    handleOpenAppInfo,
    handleOpenImpersonation,
    handleLogout,
    toggleMenu,
  }
}
