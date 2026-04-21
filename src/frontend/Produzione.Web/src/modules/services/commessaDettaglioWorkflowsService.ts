import type {
  CommessaDettaglioConfiguraResponse,
  CommessaDettaglioConfiguraSaveRequest,
  CommessaSegnalazioneCreateRequest,
  CommessaSegnalazioneDeleteRequest,
  CommessaSegnalazioneMessaggioCreateRequest,
  CommessaSegnalazioneMessaggioDeleteRequest,
  CommessaSegnalazioneMessaggioUpdateRequest,
  CommessaSegnalazioneStatoRequest,
  CommessaSegnalazioneUpdateRequest,
  CommesseDettaglioSegnalazioniResponse,
} from '../types/appTypes'

type HeaderBuilder = (token: string, impersonationUsername?: string) => Record<string, string>
type BackendUrlBuilder = (path: string) => string
type ApiMessageReader = (response: Response) => Promise<string>

type ServiceDependencies = {
  toBackendUrl: BackendUrlBuilder
  authHeaders: HeaderBuilder
  readApiMessage: ApiMessageReader
}

export type ServiceResult<T> = {
  ok: boolean
  status: number
  data?: T
  message: string
}

export class CommessaDettaglioWorkflowsService {
  private readonly toBackendUrl: BackendUrlBuilder

  private readonly authHeaders: HeaderBuilder

  private readonly readApiMessage: ApiMessageReader

  constructor({ toBackendUrl, authHeaders, readApiMessage }: ServiceDependencies) {
    this.toBackendUrl = toBackendUrl
    this.authHeaders = authHeaders
    this.readApiMessage = readApiMessage
  }

  async loadConfigura(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
  }): Promise<ServiceResult<CommessaDettaglioConfiguraResponse>> {
    const query = new URLSearchParams()
    query.set('profile', params.profile)
    query.set('commessa', params.commessa)

    const response = await fetch(
      this.toBackendUrl(`/api/commesse/dettaglio/configura?${query.toString()}`),
      {
        method: 'GET',
        headers: this.authHeaders(params.token, params.impersonationUsername ?? ''),
      },
    )

    if (!response.ok) {
      const message = await this.readApiMessage(response)
      return {
        ok: false,
        status: response.status,
        message: message || `Errore caricamento configurazione commessa (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommessaDettaglioConfiguraResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: '',
    }
  }

  async saveConfigura(params: {
    token: string
    impersonationUsername?: string
    profile: string
    request: CommessaDettaglioConfiguraSaveRequest
  }): Promise<ServiceResult<CommessaDettaglioConfiguraResponse>> {
    const query = new URLSearchParams()
    query.set('profile', params.profile)

    const response = await fetch(
      this.toBackendUrl(`/api/commesse/dettaglio/configura?${query.toString()}`),
      {
        method: 'POST',
        headers: {
          ...this.authHeaders(params.token, params.impersonationUsername ?? ''),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.request),
      },
    )

    if (!response.ok) {
      const message = await this.readApiMessage(response)
      return {
        ok: false,
        status: response.status,
        message: message || `Errore salvataggio configurazione commessa (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommessaDettaglioConfiguraResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: '',
    }
  }

  async loadSegnalazioni(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    includeChiuse: boolean
    idSegnalazioneThread?: number | null
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    const query = new URLSearchParams()
    query.set('profile', params.profile)
    query.set('commessa', params.commessa)
    query.set('includeChiuse', params.includeChiuse ? 'true' : 'false')
    if (params.idSegnalazioneThread && params.idSegnalazioneThread > 0) {
      query.set('idSegnalazioneThread', String(params.idSegnalazioneThread))
    }

    const response = await fetch(
      this.toBackendUrl(`/api/commesse/dettaglio/segnalazioni?${query.toString()}`),
      {
        method: 'GET',
        headers: this.authHeaders(params.token, params.impersonationUsername ?? ''),
      },
    )

    if (!response.ok) {
      const message = await this.readApiMessage(response)
      return {
        ok: false,
        status: response.status,
        message: message || `Errore caricamento segnalazioni commessa (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommesseDettaglioSegnalazioniResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: '',
    }
  }

  async apriSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    request: CommessaSegnalazioneCreateRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneCreateRequest>({
      path: '/api/commesse/dettaglio/segnalazioni/apri',
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore apertura segnalazione.",
    })
  }

  async modificaSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneUpdateRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneUpdateRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/modifica?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      method: 'PUT',
      message: "Errore modifica segnalazione.",
    })
  }

  async cambiaStatoSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneStatoRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneStatoRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/stato?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore aggiornamento stato segnalazione.",
    })
  }

  async chiudiSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneStatoRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneStatoRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/chiudi?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore chiusura segnalazione.",
    })
  }

  async riapriSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneStatoRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneStatoRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/riapri?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore riapertura segnalazione.",
    })
  }

  async eliminaSegnalazione(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneDeleteRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneDeleteRequest>({
      path: `/api/commesse/dettaglio/segnalazioni?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      method: 'DELETE',
      message: "Errore eliminazione segnalazione.",
    })
  }

  async inserisciMessaggio(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    request: CommessaSegnalazioneMessaggioCreateRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneMessaggioCreateRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/messaggi?commessa=${encodeURIComponent(params.commessa)}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore inserimento messaggio segnalazione.",
    })
  }

  async modificaMessaggio(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    idSegnalazione: number
    request: CommessaSegnalazioneMessaggioUpdateRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneMessaggioUpdateRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/messaggi?commessa=${encodeURIComponent(params.commessa)}&idSegnalazione=${params.idSegnalazione}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      method: 'PUT',
      message: "Errore modifica messaggio segnalazione.",
    })
  }

  async eliminaMessaggio(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
    idSegnalazione: number
    request: CommessaSegnalazioneMessaggioDeleteRequest
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    return this.postSegnalazione<CommessaSegnalazioneMessaggioDeleteRequest>({
      path: `/api/commesse/dettaglio/segnalazioni/messaggi/elimina?commessa=${encodeURIComponent(params.commessa)}&idSegnalazione=${params.idSegnalazione}`,
      token: params.token,
      impersonationUsername: params.impersonationUsername,
      profile: params.profile,
      body: params.request,
      message: "Errore eliminazione messaggio segnalazione.",
    })
  }

  private async postSegnalazione<TBody>(params: {
    path: string
    token: string
    impersonationUsername?: string
    profile: string
    body: TBody
    method?: 'POST' | 'PUT' | 'DELETE'
    message: string
  }): Promise<ServiceResult<CommesseDettaglioSegnalazioniResponse>> {
    const separator = params.path.includes('?') ? '&' : '?'
    const url = this.toBackendUrl(`${params.path}${separator}profile=${encodeURIComponent(params.profile)}`)
    const response = await fetch(url, {
      method: params.method ?? 'POST',
      headers: {
        ...this.authHeaders(params.token, params.impersonationUsername ?? ''),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.body),
    })

    if (!response.ok) {
      const message = await this.readApiMessage(response)
      return {
        ok: false,
        status: response.status,
        message: message || `${params.message} (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommesseDettaglioSegnalazioniResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: '',
    }
  }
}
