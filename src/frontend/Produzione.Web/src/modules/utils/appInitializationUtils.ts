// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

export function installMenuDismissHandlers(setOpenMenu: (value: any) => void) {
  function handleGlobalClick(event: MouseEvent) {
    if (!(event.target instanceof Element)) {
      setOpenMenu(null)
      return
    }

    if (!event.target.closest('.menu-dropdown')) {
      setOpenMenu(null)
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpenMenu(null)
    }
  }

  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleEscape)

  return () => {
    document.removeEventListener('click', handleGlobalClick)
    document.removeEventListener('keydown', handleEscape)
  }
}

export function bootstrapSessionFromStorage(ctx: any) {
  const {
    ensureSession,
    loadHealth,
    readSharedSsoCookie,
    redirectGuardKey,
    redirectToCentralAuth,
    routeActAs,
    saveToken,
    setImpersonationInput,
    setStatusMessage,
    tokenStorageKey,
    writeSharedSsoCookie,
  } = ctx

  void loadHealth()

  const savedImpersonation = (sessionStorage.getItem(ctx.impersonationStorageKey) ?? '').trim()
  const initialImpersonation = savedImpersonation || routeActAs
  if (initialImpersonation) {
    setImpersonationInput(initialImpersonation)
  }

  const params = new URLSearchParams(window.location.search)
  const tokenFromAuth = params.get('token')?.trim() ?? ''

  if (tokenFromAuth) {
    sessionStorage.removeItem(redirectGuardKey)
    saveToken(tokenFromAuth)
    writeSharedSsoCookie(tokenFromAuth)
    params.delete('token')
    params.delete('expiresAtUtc')
    const queryString = params.toString()
    const cleanUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname
    window.history.replaceState({}, document.title, cleanUrl)
    setStatusMessage('Token ricevuto da Auth. Verifica sessione...')
    void ensureSession(tokenFromAuth, 'invalid_token', initialImpersonation)
    return
  }

  const savedToken = (localStorage.getItem(tokenStorageKey) ?? '').trim()
  if (savedToken) {
    sessionStorage.removeItem(redirectGuardKey)
    saveToken(savedToken)
    writeSharedSsoCookie(savedToken)
    setStatusMessage('Sessione locale trovata. Verifica in corso...')
    void ensureSession(savedToken, 'stale_token', initialImpersonation)
    return
  }

  const sharedSsoToken = readSharedSsoCookie()
  if (sharedSsoToken) {
    sessionStorage.removeItem(redirectGuardKey)
    saveToken(sharedSsoToken)
    setStatusMessage('Sessione SSO condivisa trovata. Verifica in corso...')
    void ensureSession(sharedSsoToken, 'stale_token', initialImpersonation)
    return
  }

  sessionStorage.removeItem(redirectGuardKey)
  redirectToCentralAuth('missing_token')
}

export function restoreSintesiStateForProfile(ctx: any) {
  const {
    activeImpersonation,
    canAccessAnalisiCommesseMenu,
    currentProfile,
    emptySintesiFiltersForm,
    loadSintesiFilters,
    setActivePage,
    setCommessaSearch,
    setSintesiFiltersForm,
    setSintesiMode,
    setSintesiRows,
    setSintesiSearched,
    setSortColumn,
    setSortDirection,
    setStatusMessage,
    sintesiMode,
    token,
    tryReadPersistedSintesiState,
  } = ctx

  if (!token.trim() || !currentProfile) {
    return
  }

  if (!canAccessAnalisiCommesseMenu) {
    setSintesiRows([])
    setSintesiSearched(false)
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    return
  }

  const persisted = tryReadPersistedSintesiState()
  if (
    persisted &&
    persisted.profile === currentProfile &&
    persisted.impersonation === activeImpersonation
  ) {
    const restoredFilters = {
      anni: Array.isArray(persisted.filters.anni) ? persisted.filters.anni : [],
      attiveDalAnno: persisted.filters.attiveDalAnno ?? '',
      commessa: persisted.filters.commessa ?? '',
      tipologiaCommessa: persisted.filters.tipologiaCommessa ?? '',
      stato: persisted.filters.stato ?? '',
      macroTipologia: persisted.filters.macroTipologia ?? '',
      prodotto: persisted.filters.prodotto ?? '',
      businessUnit: persisted.filters.businessUnit ?? '',
      rcc: persisted.filters.rcc ?? '',
      pm: persisted.filters.pm ?? '',
      provenienza: persisted.filters.provenienza ?? '',
      soloScadute: Boolean(persisted.filters.soloScadute),
      escludiProdotti: Boolean(persisted.filters.escludiProdotti),
    }

    setActivePage('none')
    setSintesiMode(persisted.mode === 'aggregato' ? 'aggregato' : 'dettaglio')
    setCommessaSearch(persisted.commessaSearch ?? '')
    setSortColumn(persisted.sortColumn ?? 'commessa')
    setSortDirection(persisted.sortDirection === 'desc' ? 'desc' : 'asc')
    setSintesiFiltersForm(restoredFilters)
    setSintesiRows(Array.isArray(persisted.rows) ? persisted.rows : [])
    setSintesiSearched(Boolean(persisted.searched))
    void loadSintesiFilters(token, activeImpersonation, currentProfile, restoredFilters.anni, 'commesse')
    setStatusMessage('Lista commesse ripristinata dalla sessione.')
    return
  }

  setSintesiRows([])
  setSintesiSearched(false)
  setCommessaSearch('')
  setSortColumn('commessa')
  setSortDirection('asc')
  setSintesiFiltersForm(emptySintesiFiltersForm)
  void loadSintesiFilters(token, activeImpersonation, currentProfile, [], 'commesse')
}

export function processDetailRouteRequest(ctx: any) {
  const {
    activeImpersonation,
    currentProfile,
    detailRouteProcessed,
    profiles,
    routeRequest,
    setDetailRouteProcessed,
    setSelectedProfile,
    token,
  } = ctx

  if (!token.trim() || !currentProfile || detailRouteProcessed) {
    return
  }

  if (routeRequest.profile) {
    const matchedProfile = profiles.find((profile: string) => (
      profile.localeCompare(routeRequest.profile, 'it', { sensitivity: 'base' }) === 0
    ))

    if (matchedProfile && matchedProfile !== currentProfile) {
      setSelectedProfile(matchedProfile)
      return
    }
  }

  if (routeRequest.page || routeRequest.commessa) {
    const url = new URL(window.location.href)
    url.searchParams.delete('page')
    url.searchParams.delete('commessa')
    window.history.replaceState({}, document.title, url.toString())
  }

  setDetailRouteProcessed(true)
}
