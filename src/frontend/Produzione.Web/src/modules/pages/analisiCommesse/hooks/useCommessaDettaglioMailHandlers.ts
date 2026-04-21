// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react'
import type {
  CommessaSintesiMailSendRequest,
  CommessaSintesiMailSendResponse,
  CommesseDettaglioResponse,
  CommesseDettaglioSintesiMailPreviewResponse,
} from '../../../types/appTypes'
import type { CommessaSintesiMailService } from '../../../services/commessaSintesiMailService'

type UseCommessaDettaglioMailHandlersArgs = {
  token: string
  currentProfile: string
  activeImpersonation: string
  detailData: CommesseDettaglioResponse | null
  detailCommessa: string
  commessaSintesiMailService: CommessaSintesiMailService
  clearSession: () => void
  redirectToCentralAuth: (reason: string) => void
  setDetailStatusMessage: React.Dispatch<React.SetStateAction<string>>
  setDetailSintesiMailModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDetailSintesiMailPreview: React.Dispatch<React.SetStateAction<CommesseDettaglioSintesiMailPreviewResponse | null>>
  setDetailSintesiMailPreviewLoading: React.Dispatch<React.SetStateAction<boolean>>
  setDetailSintesiMailSending: React.Dispatch<React.SetStateAction<boolean>>
  setDetailSintesiMailStatusMessage: React.Dispatch<React.SetStateAction<string>>
  setDetailSintesiMailErrorMessage: React.Dispatch<React.SetStateAction<string>>
}

export function useCommessaDettaglioMailHandlers(args: UseCommessaDettaglioMailHandlersArgs) {
  const {
    token,
    currentProfile,
    activeImpersonation,
    detailData,
    detailCommessa,
    commessaSintesiMailService,
    clearSession,
    redirectToCentralAuth,
    setDetailStatusMessage,
    setDetailSintesiMailModalOpen,
    setDetailSintesiMailPreview,
    setDetailSintesiMailPreviewLoading,
    setDetailSintesiMailSending,
    setDetailSintesiMailStatusMessage,
    setDetailSintesiMailErrorMessage,
  } = args

  const resetDetailSintesiMailState = useCallback(() => {
    setDetailSintesiMailPreview(null)
    setDetailSintesiMailPreviewLoading(false)
    setDetailSintesiMailSending(false)
    setDetailSintesiMailStatusMessage('')
    setDetailSintesiMailErrorMessage('')
  }, [
    setDetailSintesiMailErrorMessage,
    setDetailSintesiMailPreview,
    setDetailSintesiMailPreviewLoading,
    setDetailSintesiMailSending,
    setDetailSintesiMailStatusMessage,
  ])

  const loadDetailSintesiMailPreview = useCallback(async (commessa = detailData?.commessa || detailCommessa) => {
    const normalizedCommessa = (commessa ?? '').trim()
    if (!normalizedCommessa || !token.trim() || !currentProfile.trim()) {
      setDetailSintesiMailPreview(null)
      setDetailSintesiMailErrorMessage('Sessione o commessa non disponibili per la preview invio sintesi.')
      return
    }

    setDetailSintesiMailPreviewLoading(true)
    setDetailSintesiMailErrorMessage('')
    setDetailSintesiMailStatusMessage('')

    try {
      const previewResult = await commessaSintesiMailService.loadPreview({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        commessa: normalizedCommessa,
      })

      if (previewResult.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (!previewResult.ok || !previewResult.data) {
        setDetailSintesiMailPreview(null)
        setDetailSintesiMailErrorMessage(
          previewResult.message || `Errore caricamento destinatari invio sintesi (${previewResult.status}).`,
        )
        return
      }

      setDetailSintesiMailPreview(previewResult.data)
      setDetailSintesiMailStatusMessage(
        `Destinatari individuati: ${previewResult.data.recipients.length} risorse.`,
      )
    } catch {
      setDetailSintesiMailPreview(null)
      setDetailSintesiMailErrorMessage('Errore inatteso durante il caricamento preview invio sintesi.')
    } finally {
      setDetailSintesiMailPreviewLoading(false)
    }
  }, [
    activeImpersonation,
    clearSession,
    commessaSintesiMailService,
    currentProfile,
    detailCommessa,
    detailData?.commessa,
    redirectToCentralAuth,
    setDetailSintesiMailErrorMessage,
    setDetailSintesiMailPreview,
    setDetailSintesiMailPreviewLoading,
    setDetailSintesiMailStatusMessage,
    token,
  ])

  const openDetailSintesiMailModal = useCallback(() => {
    const commessa = (detailData?.commessa || detailCommessa || '').trim()
    if (!commessa) {
      setDetailStatusMessage("Commessa non disponibile per l'invio sintesi.")
      return
    }

    resetDetailSintesiMailState()
    setDetailSintesiMailModalOpen(true)
    void loadDetailSintesiMailPreview(commessa)
  }, [
    detailCommessa,
    detailData?.commessa,
    loadDetailSintesiMailPreview,
    resetDetailSintesiMailState,
    setDetailSintesiMailModalOpen,
    setDetailStatusMessage,
  ])

  const closeDetailSintesiMailModal = useCallback(() => {
    setDetailSintesiMailModalOpen(false)
    resetDetailSintesiMailState()
  }, [resetDetailSintesiMailState, setDetailSintesiMailModalOpen])

  const sendDetailSintesiMail = useCallback(async (request: CommessaSintesiMailSendRequest) => {
    if (!token.trim() || !currentProfile.trim()) {
      setDetailSintesiMailErrorMessage('Sessione non disponibile: eseguire nuovamente il login.')
      return
    }

    setDetailSintesiMailSending(true)
    setDetailSintesiMailErrorMessage('')
    setDetailSintesiMailStatusMessage('')
    try {
      const sendResult = await commessaSintesiMailService.send({
        token,
        impersonationUsername: activeImpersonation,
        profile: currentProfile,
        request,
      })

      if (sendResult.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (!sendResult.ok || !sendResult.data) {
        setDetailSintesiMailErrorMessage(
          sendResult.message || `Errore invio sintesi commessa (${sendResult.status}).`,
        )
        return
      }

      const payload: CommessaSintesiMailSendResponse = sendResult.data
      if (!payload.success) {
        setDetailSintesiMailErrorMessage(
          payload.message || 'Invio sintesi commessa non riuscito.',
        )
        return
      }

      setDetailSintesiMailStatusMessage(
        payload.message || 'Invio sintesi commessa completato.',
      )
      setDetailStatusMessage(
        payload.message || 'Invio sintesi commessa completato.',
      )
      setDetailSintesiMailModalOpen(false)
      resetDetailSintesiMailState()
    } catch {
      setDetailSintesiMailErrorMessage("Errore inatteso durante l'invio sintesi commessa.")
    } finally {
      setDetailSintesiMailSending(false)
    }
  }, [
    activeImpersonation,
    clearSession,
    commessaSintesiMailService,
    currentProfile,
    redirectToCentralAuth,
    resetDetailSintesiMailState,
    setDetailSintesiMailErrorMessage,
    setDetailSintesiMailSending,
    setDetailSintesiMailStatusMessage,
    setDetailSintesiMailModalOpen,
    setDetailStatusMessage,
    token,
  ])

  return {
    resetDetailSintesiMailState,
    loadDetailSintesiMailPreview,
    openDetailSintesiMailModal,
    closeDetailSintesiMailModal,
    sendDetailSintesiMail,
  }
}