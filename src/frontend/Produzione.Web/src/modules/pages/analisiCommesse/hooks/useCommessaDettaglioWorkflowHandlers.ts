// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react'
import type {
  CommessaDettaglioConfiguraSaveRequest,
  CommessaSegnalazioneCreateRequest,
  CommessaSegnalazioneDeleteRequest,
  CommessaSegnalazioneMessaggioCreateRequest,
  CommessaSegnalazioneMessaggioDeleteRequest,
  CommessaSegnalazioneMessaggioUpdateRequest,
  CommessaSegnalazioneStatoRequest,
  CommessaSegnalazioneUpdateRequest,
  CommesseDettaglioResponse,
  CommesseDettaglioSegnalazioniResponse,
} from '../../../types/appTypes'
import type { CommessaDettaglioWorkflowsService } from '../../../services/commessaDettaglioWorkflowsService'

type UseCommessaDettaglioWorkflowHandlersArgs = {
  token: string
  currentProfile: string
  activeImpersonation: string
  detailData: CommesseDettaglioResponse | null
  detailCommessa: string
  detailSegnalazioniIncludeChiuse: boolean
  commessaDettaglioWorkflowsService: CommessaDettaglioWorkflowsService
  clearSession: () => void
  redirectToCentralAuth: (reason: string) => void
  setDetailData: React.Dispatch<React.SetStateAction<CommesseDettaglioResponse | null>>
  setDetailStatusMessage: React.Dispatch<React.SetStateAction<string>>
  setDetailConfiguraData: React.Dispatch<React.SetStateAction<any>>
  setDetailConfiguraLoading: React.Dispatch<React.SetStateAction<boolean>>
  setDetailConfiguraSaving: React.Dispatch<React.SetStateAction<boolean>>
  setDetailConfiguraStatusMessage: React.Dispatch<React.SetStateAction<string>>
  setDetailSegnalazioniData: React.Dispatch<React.SetStateAction<any>>
  setDetailSegnalazioniLoading: React.Dispatch<React.SetStateAction<boolean>>
  setDetailSegnalazioniSaving: React.Dispatch<React.SetStateAction<boolean>>
  setDetailSegnalazioniStatusMessage: React.Dispatch<React.SetStateAction<string>>
  setDetailSegnalazioniIncludeChiuse: React.Dispatch<React.SetStateAction<boolean>>
}

export function useCommessaDettaglioWorkflowHandlers(args: UseCommessaDettaglioWorkflowHandlersArgs) {
  const {
    token,
    currentProfile,
    activeImpersonation,
    detailData,
    detailCommessa,
    detailSegnalazioniIncludeChiuse,
    commessaDettaglioWorkflowsService,
    clearSession,
    redirectToCentralAuth,
    setDetailData,
    setDetailStatusMessage,
    setDetailConfiguraData,
    setDetailConfiguraLoading,
    setDetailConfiguraSaving,
    setDetailConfiguraStatusMessage,
    setDetailSegnalazioniData,
    setDetailSegnalazioniLoading,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    setDetailSegnalazioniIncludeChiuse,
  } = args

  const applySegnalazioniOperationResult = useCallback((
    result: {
      status: number
      ok: boolean
      data?: CommesseDettaglioSegnalazioniResponse
      message: string
    },
    successMessage: string,
  ) => {
    if (result.status === 401) {
      clearSession()
      redirectToCentralAuth('stale_token')
      return false
    }

    if (!result.ok || !result.data) {
      setDetailSegnalazioniStatusMessage(
        result.message || `Operazione segnalazioni non riuscita (${result.status}).`,
      )
      return false
    }

    setDetailSegnalazioniData(result.data)
    setDetailSegnalazioniStatusMessage(successMessage)
    return true
  }, [
    clearSession,
    redirectToCentralAuth,
    setDetailSegnalazioniData,
    setDetailSegnalazioniStatusMessage,
  ])

  const loadDetailConfigura = useCallback(async (
    commessa = detailData?.commessa || detailCommessa,
    jwt = token,
    impersonationUsername = activeImpersonation,
    profile = currentProfile,
  ) => {
    const normalizedCommessa = (commessa ?? '').trim()
    if (!normalizedCommessa || !jwt.trim() || !profile.trim()) {
      return
    }

    setDetailConfiguraLoading(true)
    setDetailConfiguraStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.loadConfigura({
        token: jwt,
        impersonationUsername,
        profile,
        commessa: normalizedCommessa,
      })

      if (result.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (!result.ok || !result.data) {
        setDetailConfiguraData(null)
        setDetailConfiguraStatusMessage(
          result.message || `Errore caricamento configurazione commessa (${result.status}).`,
        )
        return
      }

      setDetailConfiguraData(result.data)
      setDetailConfiguraStatusMessage(`Configurazione commessa "${normalizedCommessa}" caricata.`)
    } catch {
      setDetailConfiguraData(null)
      setDetailConfiguraStatusMessage('Errore inatteso durante il caricamento configurazione commessa.')
    } finally {
      setDetailConfiguraLoading(false)
    }
  }, [
    activeImpersonation,
    clearSession,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    redirectToCentralAuth,
    setDetailConfiguraData,
    setDetailConfiguraLoading,
    setDetailConfiguraStatusMessage,
    token,
  ])

  const saveDetailConfigura = useCallback(async (request: CommessaDettaglioConfiguraSaveRequest) => {
    if (!token.trim() || !currentProfile.trim()) {
      setDetailConfiguraStatusMessage("Sessione non disponibile, eseguire nuovamente l'accesso.")
      return
    }

    const normalizedCommessa = (request.commessa ?? '').trim()
    if (!normalizedCommessa) {
      setDetailConfiguraStatusMessage('Commessa non valida per il salvataggio configurazione.')
      return
    }

    setDetailConfiguraSaving(true)
    setDetailConfiguraStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.saveConfigura({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        request: {
          ...request,
          commessa: normalizedCommessa,
        },
      })

      if (result.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (!result.ok || !result.data) {
        setDetailConfiguraStatusMessage(
          result.message || `Errore salvataggio configurazione commessa (${result.status}).`,
        )
        return
      }

      const payload = result.data
      setDetailConfiguraData(payload)
      setDetailData((current) => {
        if (!current || !current.anagrafica) {
          return current
        }

        return {
          ...current,
          anagrafica: {
            ...current.anagrafica,
            tipologiaCommessa: payload.tipologiaCommessa,
            prodotto: payload.prodotto,
          },
        }
      })
      setDetailConfiguraStatusMessage(`Configurazione commessa "${normalizedCommessa}" salvata.`)
      setDetailStatusMessage(`Configurazione commessa "${normalizedCommessa}" aggiornata.`)
    } catch {
      setDetailConfiguraStatusMessage('Errore inatteso durante il salvataggio configurazione commessa.')
    } finally {
      setDetailConfiguraSaving(false)
    }
  }, [
    activeImpersonation,
    clearSession,
    commessaDettaglioWorkflowsService,
    currentProfile,
    redirectToCentralAuth,
    setDetailConfiguraData,
    setDetailConfiguraSaving,
    setDetailConfiguraStatusMessage,
    setDetailData,
    setDetailStatusMessage,
    token,
  ])

  const loadDetailSegnalazioni = useCallback(async (options?: {
    commessa?: string
    includeChiuse?: boolean
    idSegnalazioneThread?: number | null
  }) => {
    const normalizedCommessa = (options?.commessa ?? detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      return
    }

    const includeChiuse = options?.includeChiuse ?? detailSegnalazioniIncludeChiuse
    const idSegnalazioneThread = options?.idSegnalazioneThread ?? null

    setDetailSegnalazioniLoading(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.loadSegnalazioni({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        includeChiuse,
        idSegnalazioneThread,
      })

      if (result.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (!result.ok || !result.data) {
        setDetailSegnalazioniData(null)
        setDetailSegnalazioniStatusMessage(
          result.message || `Errore caricamento segnalazioni commessa (${result.status}).`,
        )
        return
      }

      setDetailSegnalazioniIncludeChiuse(includeChiuse)
      setDetailSegnalazioniData(result.data)
      setDetailSegnalazioniStatusMessage('')
    } catch {
      setDetailSegnalazioniData(null)
      setDetailSegnalazioniStatusMessage('Errore inatteso durante il caricamento segnalazioni commessa.')
    } finally {
      setDetailSegnalazioniLoading(false)
    }
  }, [
    activeImpersonation,
    clearSession,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    detailSegnalazioniIncludeChiuse,
    redirectToCentralAuth,
    setDetailSegnalazioniData,
    setDetailSegnalazioniIncludeChiuse,
    setDetailSegnalazioniLoading,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const apriDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneCreateRequest): Promise<boolean> => {
    const normalizedCommessa = (request.commessa ?? detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per apertura segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.apriSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        request: {
          ...request,
          commessa: normalizedCommessa,
        },
      })
      return applySegnalazioniOperationResult(result, 'Segnalazione aperta con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante apertura segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const modificaDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneUpdateRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per modifica segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.modificaSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Segnalazione modificata con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante modifica segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const cambiaStatoDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneStatoRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per cambio stato segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.cambiaStatoSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Stato segnalazione aggiornato.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante aggiornamento stato segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const chiudiDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneStatoRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per chiusura segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.chiudiSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Segnalazione chiusa con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante chiusura segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const riapriDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneStatoRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per riapertura segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.riapriSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Segnalazione riaperta con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante riapertura segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const eliminaDetailSegnalazione = useCallback(async (request: CommessaSegnalazioneDeleteRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per eliminazione segnalazione.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.eliminaSegnalazione({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Segnalazione eliminata con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante eliminazione segnalazione.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const inserisciDetailSegnalazioneMessaggio = useCallback(async (request: CommessaSegnalazioneMessaggioCreateRequest): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per inserimento messaggio.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.inserisciMessaggio({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Messaggio inserito con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante inserimento messaggio.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const modificaDetailSegnalazioneMessaggio = useCallback(async (
    idSegnalazione: number,
    request: CommessaSegnalazioneMessaggioUpdateRequest,
  ): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per modifica messaggio.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.modificaMessaggio({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        idSegnalazione,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Messaggio modificato con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante modifica messaggio.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  const eliminaDetailSegnalazioneMessaggio = useCallback(async (
    idSegnalazione: number,
    request: CommessaSegnalazioneMessaggioDeleteRequest,
  ): Promise<boolean> => {
    const normalizedCommessa = (detailData?.commessa ?? detailCommessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSegnalazioniStatusMessage('Sessione o commessa non disponibili per eliminazione messaggio.')
      return false
    }

    setDetailSegnalazioniSaving(true)
    setDetailSegnalazioniStatusMessage('')
    try {
      const result = await commessaDettaglioWorkflowsService.eliminaMessaggio({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
        idSegnalazione,
        request,
      })
      return applySegnalazioniOperationResult(result, 'Messaggio eliminato con successo.')
    } catch {
      setDetailSegnalazioniStatusMessage('Errore inatteso durante eliminazione messaggio.')
      return false
    } finally {
      setDetailSegnalazioniSaving(false)
    }
  }, [
    activeImpersonation,
    applySegnalazioniOperationResult,
    commessaDettaglioWorkflowsService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    setDetailSegnalazioniSaving,
    setDetailSegnalazioniStatusMessage,
    token,
  ])

  return {
    loadDetailConfigura,
    saveDetailConfigura,
    loadDetailSegnalazioni,
    apriDetailSegnalazione,
    modificaDetailSegnalazione,
    cambiaStatoDetailSegnalazione,
    chiudiDetailSegnalazione,
    riapriDetailSegnalazione,
    eliminaDetailSegnalazione,
    inserisciDetailSegnalazioneMessaggio,
    modificaDetailSegnalazioneMessaggio,
    eliminaDetailSegnalazioneMessaggio,
  }
}