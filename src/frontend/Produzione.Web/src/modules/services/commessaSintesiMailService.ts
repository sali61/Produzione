import type {
  CommessaSintesiMailSendRequest,
  CommessaSintesiMailSendResponse,
  CommesseDettaglioSintesiMailPreviewResponse,
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

export class CommessaSintesiMailService {
  private readonly toBackendUrl: BackendUrlBuilder

  private readonly authHeaders: HeaderBuilder

  private readonly readApiMessage: ApiMessageReader

  constructor({ toBackendUrl, authHeaders, readApiMessage }: ServiceDependencies) {
    this.toBackendUrl = toBackendUrl
    this.authHeaders = authHeaders
    this.readApiMessage = readApiMessage
  }

  async loadPreview(params: {
    token: string
    impersonationUsername?: string
    profile: string
    commessa: string
  }): Promise<ServiceResult<CommesseDettaglioSintesiMailPreviewResponse>> {
    const query = new URLSearchParams()
    query.set('profile', params.profile)
    query.set('commessa', params.commessa)

    const response = await fetch(
      this.toBackendUrl(`/api/commesse/dettaglio/sintesi-mail/preview?${query.toString()}`),
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
        message: message || `Errore caricamento destinatari invio sintesi (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommesseDettaglioSintesiMailPreviewResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: '',
    }
  }

  async send(params: {
    token: string
    impersonationUsername?: string
    profile: string
    request: CommessaSintesiMailSendRequest
  }): Promise<ServiceResult<CommessaSintesiMailSendResponse>> {
    const query = new URLSearchParams()
    query.set('profile', params.profile)

    const response = await fetch(
      this.toBackendUrl(`/api/commesse/dettaglio/sintesi-mail/send?${query.toString()}`),
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
        message: message || `Errore invio sintesi commessa (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CommessaSintesiMailSendResponse
    return {
      ok: true,
      status: response.status,
      data: payload,
      message: payload.message || '',
    }
  }
}
