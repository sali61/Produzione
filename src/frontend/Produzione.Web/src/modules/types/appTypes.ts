export type CurrentUser = {
  idRisorsa: number
  username: string
  fullName: string
  ou: string
  ouScopes: string[]
  roles: string[]
  profiles?: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  impersonatedUsername?: string | null
  impersonatorUsername?: string | null
  authenticatedIdRisorsa?: number
  authenticatedUsername?: string
  authenticatedRoles?: string[]
  authenticatedOuScopes?: string[]
}

export type AvailableProfilesResponse = {
  profiles: string[]
  ouScopes: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  authenticatedUsername?: string
  effectiveUsername?: string
}

export type SessionProbeResult =
  | { state: 'ok'; user: CurrentUser }
  | { state: 'unauthorized' }
  | { state: 'forbidden'; message: string }
  | { state: 'error'; message: string }

export type AppHealthResponse = {
  service?: string
  status?: string
  utcNow?: string
  environment?: string
  applicationVersion?: string
}

export type MenuKey = 'sintesi' | 'risorse' | 'analisi-proiezioni' | 'previsioni' | 'processo-offerta' | 'dati-contabili' | 'user'
export type DetailTabKey = 'storico' | 'dati-contabili' | 'commerciale' | 'personale' | 'configura' | 'segnalazioni'
export type AppPage =
  | 'none'
  | 'commesse-sintesi'
  | 'commesse-andamento-mensile'
  | 'commesse-anomale'
  | 'commesse-segnalazioni'
  | 'commesse-dati-annuali-aggregati'
  | 'risorse-risultati'
  | 'risorse-risultati-pivot'
  | 'risorse-risultati-mensile'
  | 'risorse-risultati-mensile-pivot'
  | 'risorse-ou-risorse'
  | 'risorse-ou-risorse-pivot'
  | 'risorse-ou-risorse-mensile'
  | 'risorse-ou-risorse-mensile-pivot'
  | 'prodotti-sintesi'
  | 'analisi-rcc-risultato-mensile'
  | 'analisi-rcc-pivot-fatturato'
  | 'analisi-bu-risultato-mensile'
  | 'analisi-bu-pivot-fatturato'
  | 'analisi-burcc-risultato-mensile'
  | 'analisi-burcc-pivot-fatturato'
  | 'analisi-piano-fatturazione'
  | 'analisi-albero-proiezioni'
  | 'analisi-dettaglio-fatturato'
  | 'previsioni-funnel'
  | 'previsioni-report-funnel-rcc'
  | 'previsioni-report-funnel-bu'
  | 'previsioni-report-funnel-burcc'
  | 'previsioni-utile-mensile-rcc'
  | 'previsioni-utile-mensile-bu'
  | 'processo-offerta-offerte'
  | 'processo-offerta-sintesi-rcc'
  | 'processo-offerta-sintesi-bu'
  | 'processo-offerta-percentuale-successo-rcc'
  | 'processo-offerta-percentuale-successo-bu'
  | 'processo-offerta-incidenza-rcc'
  | 'processo-offerta-incidenza-bu'
  | 'dati-contabili-vendita'
  | 'dati-contabili-acquisti'
  | 'commessa-dettaglio'
export type SintesiScope = 'commesse' | 'prodotti'

export type AppInfoVoice = {
  menu: string
  voce: string
  sintesi: string
}

export type AppInfoResponse = {
  profile: string
  applicazione: string
  items: AppInfoVoice[]
}

export type AppInfoSaveRequest = {
  menu: string
  voce: string
  sintesi: string
}

export type FilterOption = {
  value: string
  label: string
}

export type CommesseSintesiFiltersResponse = {
  profile: string
  anno?: number | null
  anni: FilterOption[]
  commesse: FilterOption[]
  tipologieCommessa: FilterOption[]
  stati: FilterOption[]
  macroTipologie: FilterOption[]
  prodotti: FilterOption[]
  businessUnits: FilterOption[]
  rcc: FilterOption[]
  pm: FilterOption[]
}

export type CommesseOptionsResponse = {
  profile: string
  count: number
  items: Array<{
    commessa: string
    descrizioneCommessa?: string | null
    label?: string | null
  }>
}

export type AnalisiRccMensileValue = {
  mese: number
  valore: number
}

export type AnalisiRccRisultatoMensileRow = {
  aggregazione: string
  businessUnit?: string | null
  rcc?: string | null
  budget?: number | null
  valoriMensili: AnalisiRccMensileValue[]
}

export type AnalisiRccRisultatoMensileGrid = {
  titolo: string
  mesi: number[]
  valoriPercentuali: boolean
  righe: AnalisiRccRisultatoMensileRow[]
}

export type AnalisiRccRisultatoMensileResponse = {
  profile: string
  anno: number
  vediTutto: boolean
  rccFiltro?: string | null
  risultatoPesato: AnalisiRccRisultatoMensileGrid
  percentualePesata: AnalisiRccRisultatoMensileGrid
}

export type AnalisiRccRisultatoMensileBurccResponse = {
  profile: string
  anno: number
  vediTutto: boolean
  businessUnitFiltro?: string | null
  rccFiltro?: string | null
  businessUnitDisponibili: string[]
  rccDisponibili: string[]
  risultatoPesato: AnalisiRccRisultatoMensileGrid
  percentualePesata: AnalisiRccRisultatoMensileGrid
}

export type AnalisiRccPivotFatturatoRow = {
  anno: number
  rcc: string
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  percentualeRaggiungimentoTemporale?: number | null
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

export type AnalisiRccPivotFatturatoTotaleAnno = {
  anno: number
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  percentualeRaggiungimentoTemporale?: number | null
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

export type AnalisiRccPivotFatturatoResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  rccFiltro?: string | null
  rccDisponibili: string[]
  righe: AnalisiRccPivotFatturatoRow[]
  totaliPerAnno: AnalisiRccPivotFatturatoTotaleAnno[]
}

export type AnalisiRccPivotBurccRow = {
  anno: number
  businessUnit: string
  rcc: string
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  percentualeRaggiungimentoTemporale?: number | null
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

export type AnalisiRccPivotBurccResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  businessUnitFiltro?: string | null
  rccFiltro?: string | null
  businessUnitDisponibili: string[]
  rccDisponibili: string[]
  righe: AnalisiRccPivotBurccRow[]
  totaliPerAnno: AnalisiRccPivotFatturatoTotaleAnno[]
}

export type AnalisiRccUtileMensileRow = {
  anno: number
  aggregazione: string
  totaleRicavi: number
  totaleCosti: number
  totaleCostoPersonale: number
  totaleUtileSpecifico: number
  totaleOreLavorate: number
  totaleCostoGeneraleRibaltato: number
  percentualeMargineSuRicavi: number
  percentualeMarkupSuCosti: number
  percentualeCostIncome: number
}

export type AnalisiRccUtileMensileTotaleAnno = {
  anno: number
  totaleRicavi: number
  totaleCosti: number
  totaleCostoPersonale: number
  totaleUtileSpecifico: number
  totaleOreLavorate: number
  totaleCostoGeneraleRibaltato: number
  percentualeMargineSuRicavi: number
  percentualeMarkupSuCosti: number
  percentualeCostIncome: number
}

export type AnalisiRccUtileMensileResponse = {
  profile: string
  anni: number[]
  meseRiferimento: number
  vediTutto: boolean
  aggregazioneFiltro?: string | null
  aggregazioniDisponibili: string[]
  produzione?: number | null
  righe: AnalisiRccUtileMensileRow[]
  totaliPerAnno: AnalisiRccUtileMensileTotaleAnno[]
}

export type AnalisiRccPianoFatturazioneRow = {
  rcc: string
  isTotale: boolean
  budget: number
  valoriMensili: AnalisiRccMensileValue[]
  totaleTrim1: number
  percentualeTrim1Cumulata: number
  totaleTrim2: number
  percentualeTrim2Cumulata: number
  totaleTrim3: number
  percentualeTrim3Cumulata: number
  totaleTrim4: number
  percentualeTrim4Cumulata: number
  totaleComplessivo: number
  percentualeTotaleBudget: number
}

export type AnalisiRccPianoFatturazioneProgressValue = {
  mese: number
  importoProgressivo: number
  percentualeBudgetProgressiva: number
}

export type AnalisiRccPianoFatturazioneProgressRow = {
  rcc: string
  isTotale: boolean
  budget: number
  valoriMensili: AnalisiRccPianoFatturazioneProgressValue[]
  importoTotaleProgressivo: number
  percentualeTotaleBudget: number
}

export type AnalisiRccPianoFatturazioneResponse = {
  profile: string
  anno: number
  mesiSnapshot: number[]
  mesiRiferimento: number[]
  tipoCalcolo: string
  vediTutto: boolean
  businessUnitFiltro?: string | null
  businessUnitDisponibili: string[]
  rccFiltro?: string | null
  rccDisponibili: string[]
  righe: AnalisiRccPianoFatturazioneRow[]
}

export type AnalisiRccDettaglioFatturatoRow = {
  anno: number
  data?: string | null
  commessa: string
  businessUnit: string
  controparte: string
  provenienza: string
  fatturato: number
  fatturatoFuturo: number
  ricavoIpotetico: number
  rcc: string
  pm: string
  descrizioneMastro: string
  descrizioneConto: string
  descrizioneSottoconto: string
}

export type AnalisiRccDettaglioFatturatoResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  businessUnitFiltro?: string | null
  rccFiltro?: string | null
  pmFiltro?: string | null
  businessUnitDisponibili: string[]
  rccDisponibili: string[]
  commesseDisponibili: string[]
  provenienzeDisponibili: string[]
  contropartiDisponibili: string[]
  items: AnalisiRccDettaglioFatturatoRow[]
}

export type ProcessoOffertaDettaglioRow = {
  id: number
  businessUnit: string
  nomeProdotto: string
  codiceSocieta: string
  rcc: string
  idRcc?: number | null
  anno: number
  annoLavoro?: number | null
  commessa: string
  esito: string
  protocollo: string
  data?: string | null
  tipo: string
  oggetto: string
  statoDocumento: string
  percentualeSuccesso: number
  soluzione: string
  macroTipologia: string
  tipoCommessa: string
  controparte: string
  esitoPositivo?: boolean | null
  esitoPositivoTesto: string
  importoPrevedibile: number
  costoPrevedibile: number
  costoPrevisto: boolean
}

export type ProcessoOffertaOfferteResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  ambitoFiltro?: string | null
  esitiDisponibili: string[]
  items: ProcessoOffertaDettaglioRow[]
}

export type ProcessoOffertaSintesiRow = {
  anno: number
  aggregazione: string
  tipo: string
  esitoPositivoTesto: string
  numero: number
  importoPrevedibile: number
  costoPrevedibile: number
  percentualeRicarico: number
}

export type ProcessoOffertaSintesiResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  ambitoFiltro?: string | null
  esitiDisponibili: string[]
  aggregazioniDisponibili: string[]
  righe: ProcessoOffertaSintesiRow[]
}

export type ProcessoOffertaSuccessoCategoria = {
  ricavo: number
  costo: number
  margine: number
  ricarico: number
}

export type ProcessoOffertaSuccessoSintesiCategoria = {
  numero: number
  importo: number
  percentualeNumero: number
  percentualeImporto: number
}

export type ProcessoOffertaSuccessoSintesiRow = {
  anno: number
  aggregazione: string
  negativo: ProcessoOffertaSuccessoSintesiCategoria
  nonDefinito: ProcessoOffertaSuccessoSintesiCategoria
  positivo: ProcessoOffertaSuccessoSintesiCategoria
  totaleNumero: number
  totaleImporto: number
}

export type ProcessoOffertaSuccessoReportRow = {
  anno: number
  aggregazione: string
  negativo: ProcessoOffertaSuccessoCategoria
  nonDefinito: ProcessoOffertaSuccessoCategoria
  positivo: ProcessoOffertaSuccessoCategoria
  totale: ProcessoOffertaSuccessoCategoria
}

export type ProcessoOffertaSuccessoReportTotaleAnno = {
  anno: number
  negativo: ProcessoOffertaSuccessoCategoria
  nonDefinito: ProcessoOffertaSuccessoCategoria
  positivo: ProcessoOffertaSuccessoCategoria
  totale: ProcessoOffertaSuccessoCategoria
}

export type AnalisiRccFunnelRow = {
  businessUnit: string
  nomeProdotto: string
  codiceSocieta: string
  rcc: string
  idRcc?: number | null
  anno: number
  commessa: string
  esito: string
  protocollo: string
  data?: string | null
  tipo: string
  oggetto: string
  statoDocumento: string
  esitoProtocollo: string
  percentualeSuccesso: number
  budgetRicavo: number
  budgetPersonale: number
  budgetCosti: number
  ricavoAtteso: number
  fatturatoEmesso: number
  fatturatoFuturo: number
  futuraAnno: number
  emessaAnno: number
  totaleAnno: number
  infragruppo: boolean
  soluzione: string
  macroTipologia: string
  controparte: string
}

export type AnalisiRccFunnelResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  rccFiltro?: string | null
  rccDisponibili: string[]
  tipiDisponibili: string[]
  statiDocumentoDisponibili: string[]
  items: AnalisiRccFunnelRow[]
}

export type AnalisiRccPivotFunnelRow = {
  anno: number
  aggregazione: string
  tipo: string
  tipoDocumento: string
  percentualeSuccesso: number
  numeroProtocolli: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

export type AnalisiRccPivotFunnelTotaleAnno = {
  anno: number
  numeroProtocolli: number
  percentualeSuccesso: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

export type AnalisiRccPivotFunnelResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  aggregazioneFiltro?: string | null
  rccFiltro?: string | null
  tipoFiltro?: string | null
  tipoDocumentoFiltro?: string | null
  percentualeSuccessoFiltro?: number | null
  aggregazioniDisponibili: string[]
  rccDisponibili: string[]
  tipiDisponibili: string[]
  tipiDocumentoDisponibili: string[]
  percentualiSuccessoDisponibili: number[]
  righe: AnalisiRccPivotFunnelRow[]
  totaliPerAnno: AnalisiRccPivotFunnelTotaleAnno[]
}

export type DatiContabiliVenditaRow = {
  annoFattura?: number | null
  dataMovimento?: string | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  statoCommessa: string
  macroTipologia: string
  controparteCommessa: string
  businessUnit: string
  rcc: string
  pm: string
  numeroDocumento: string
  descrizioneMovimento: string
  causale: string
  sottoconto: string
  controparteMovimento: string
  provenienza: string
  importo: number
  fatturato: number
  fatturatoFuturo: number
  ricavoIpotetico: number
  isFuture: boolean
  isScaduta: boolean
  statoTemporale: string
}

export type DatiContabiliVenditaResponse = {
  profile: string
  count: number
  items: DatiContabiliVenditaRow[]
}

export type DatiContabiliAcquistoRow = {
  annoFattura?: number | null
  dataDocumento?: string | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  statoCommessa: string
  macroTipologia: string
  controparteCommessa: string
  businessUnit: string
  rcc: string
  pm: string
  codiceSocieta: string
  descrizioneFattura: string
  causale: string
  sottoconto: string
  controparteMovimento: string
  provenienza: string
  importoComplessivo: number
  importoContabilitaDettaglio: number
  isFuture: boolean
  isScaduta: boolean
  statoTemporale: string
}

export type DatiContabiliAcquistoResponse = {
  profile: string
  count: number
  items: DatiContabiliAcquistoRow[]
}

export type CommesseRisorseFilterOption = {
  idRisorsa: number
  value: string
  label: string
  inForza: boolean
}

export type CommesseRisorseFiltersResponse = {
  profile: string
  mensile: boolean
  anni: FilterOption[]
  mesi: FilterOption[]
  commesse: FilterOption[]
  tipologieCommessa: FilterOption[]
  stati: FilterOption[]
  macroTipologie: FilterOption[]
  controparti: FilterOption[]
  businessUnits: FilterOption[]
  ous: FilterOption[]
  rcc: FilterOption[]
  pm: FilterOption[]
  risorse: CommesseRisorseFilterOption[]
}

export type CommessaRisorseValutazioneRow = {
  annoCompetenza: number
  meseCompetenza?: number | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  idRisorsa: number
  nomeRisorsa: string
  risorsaInForza: boolean
  oreTotali: number
  fatturatoInBaseAdOre: number
  fatturatoInBaseACosto: number
  utileInBaseAdOre: number
  utileInBaseACosto: number
  costoSpecificoRisorsa: number
  idOu?: string
  nomeRuolo?: string
  percentualeUtilizzo?: number
  area?: string
  ouProduzione?: boolean
  codiceSocieta?: string
}

export type CommesseRisorseValutazioneResponse = {
  profile: string
  mensile: boolean
  count: number
  anni: number[]
  items: CommessaRisorseValutazioneRow[]
}

export type RisorseFiltersForm = {
  anni: string[]
  mesi: string[]
  commessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  controparte: string
  businessUnit: string
  ou: string
  rcc: string
  pm: string
  idRisorsa: string
  vistaCosto: boolean
}

export type RisorsePivotFieldKey =
  | 'anno'
  | 'mese'
  | 'commessa'
  | 'descrizioneCommessa'
  | 'tipologiaCommessa'
  | 'stato'
  | 'macroTipologia'
  | 'prodotto'
  | 'controparte'
  | 'businessUnit'
  | 'ou'
  | 'rcc'
  | 'pm'
  | 'risorsa'

export type CommesseRisorsePivotMetrics = {
  numeroCommesse: number
  oreTotali: number
  costoSpecificoRisorsa: number
  fatturato: number
  utile: number
}

export type CommesseRisorsePivotRow = CommesseRisorsePivotMetrics & {
  key: string
  level: number
  label: string
  kind: 'gruppo' | 'totale'
}

export type SintesiMode = 'dettaglio' | 'aggregato'
export type SortDirection = 'asc' | 'desc'
export type SortColumn =
  | 'anno'
  | 'commessa'
  | 'descrizioneCommessa'
  | 'tipologiaCommessa'
  | 'stato'
  | 'macroTipologia'
  | 'controparte'
  | 'prodotto'
  | 'businessUnit'
  | 'rcc'
  | 'pm'
  | 'oreLavorate'
  | 'costoPersonale'
  | 'ricavi'
  | 'costi'
  | 'ricaviMaturati'
  | 'utileSpecifico'
  | 'ricaviFuturi'
  | 'costiFuturi'
  | 'oreFuture'
  | 'costoPersonaleFuturo'
  | 'utileFineProgetto'

export type SintesiFiltersForm = {
  anni: string[]
  attiveDalAnno: string
  commessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  businessUnit: string
  rcc: string
  pm: string
  provenienza: string
  soloScadute: boolean
  escludiProdotti: boolean
}

export type CommessaSintesiRow = {
  anno?: number | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  ricaviMaturati: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
  oreFuture: number
  costoPersonaleFuturo: number
}

export type CommesseSintesiResponse = {
  profile: string
  count: number
  items: CommessaSintesiRow[]
}

export type CommessaAndamentoMensileRow = {
  annoCompetenza: number
  meseCompetenza: number
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  produzione: boolean
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  ricaviMaturati: number
  oreFuture: number
  costoPersonaleFuturo: number
  costoGeneraleRibaltato: number
  utileSpecifico: number
}

export type CommesseAndamentoMensileResponse = {
  profile: string
  count: number
  items: CommessaAndamentoMensileRow[]
}

export type CommessaAnomalaRow = {
  tipoAnomalia: string
  dettaglioAnomalia: string
  idCommessa: number
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  ricaviFuturi: number
  costiFuturi: number
}

export type CommesseAnomaleResponse = {
  profile: string
  count: number
  items: CommessaAnomalaRow[]
}

export type CommessaSegnalazioneAnalisiRow = {
  id: number
  idCommessa: number
  commessa: string
  idTipoSegnalazione: number
  tipoCodice: string
  tipoDescrizione: string
  titolo: string
  testo: string
  priorita: number
  stato: number
  impattaCliente: boolean
  dataEvento?: string | null
  dataInserimento?: string | null
  idRisorsaInserimento?: number | null
  nomeRisorsaInserimento: string
  dataUltimaModifica?: string | null
  idRisorsaUltimaModifica?: number | null
  nomeRisorsaUltimaModifica: string
  dataChiusura?: string | null
  idRisorsaDestinataria?: number | null
  nomeRisorsaDestinataria: string
}

export type CommesseSegnalazioniResponse = {
  profile: string
  count: number
  segnalazioni: CommessaSegnalazioneAnalisiRow[]
  thread: CommessaSegnalazioneMessaggio[]
}

export type DatiAnnualiPivotFieldKey =
  | 'anno'
  | 'commessa'
  | 'controparte'
  | 'tipologiaCommessa'
  | 'rcc'
  | 'businessUnit'
  | 'pm'
  | 'macroTipologia'
  | 'prodotto'

export type CommesseDatiAnnualiPivotMetrics = {
  numeroCommesse: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

export type CommesseDatiAnnualiPivotRow = CommesseDatiAnnualiPivotMetrics & {
  key: string
  level: number
  anno?: number | null
  label: string
  kind: 'anno' | 'gruppo' | 'totale'
  groupValues: Partial<Record<DatiAnnualiPivotFieldKey, string>>
}

export type CommesseDatiAnnualiPivotData = {
  profile: string
  anni: number[]
  items: CommessaSintesiRow[]
}

export type CommessaDettaglioAnagrafica = {
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  dataApertura?: string | null
  dataChiusura?: string | null
}

export type CommessaDettaglioAnnoRow = {
  anno: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

export type CommessaDettaglioMeseRow = {
  anno: number
  mese: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

export type CommessaRequisitoOreSummaryRow = {
  idRequisito: number
  requisito: string
  durataRequisito: number
  orePreviste: number
  oreSpese: number
  oreRestanti: number
  percentualeAvanzamento: number
}

export type CommessaRequisitoOreRisorsaRow = {
  idRequisito: number
  requisito: string
  idRisorsa: number
  nomeRisorsa: string
  durataRequisito: number
  orePreviste: number
  oreSpese: number
  oreRestanti: number
  percentualeAvanzamento: number
}

export type CommessaOreSpeseRisorsaRow = {
  idRisorsa: number
  nomeRisorsa: string
  oreSpeseTotali: number
}

export type CommessaOrdineRow = {
  protocollo: string
  documentoStato: string
  posizione: string
  idDettaglioOrdine: number
  descrizione: string
  quantita: number
  prezzoUnitario: number
  importoOrdine: number
  quantitaOriginaleOrdinata: number
  quantitaFatture: number
}

export type CommessaOffertaRow = {
  protocollo: string
  anno?: number | null
  data?: string | null
  oggetto: string
  documentoStato: string
  ricavoPrevisto: number
  costoPrevisto: number
  costoPrevistoPersonale: number
  orePrevisteOfferta: number
  percentualeSuccesso: number
  ordiniCollegati: string
}

export type CommessaAvanzamentoRow = {
  id: number
  idCommessa: number
  percentualeRaggiunto: number
  importoRiferimento: number
  oreFuture: number
  oreRestanti: number
  costoPersonaleFuturo: number
  dataRiferimento?: string | null
  dataSalvataggio?: string | null
  idAutore: number
}

export type CommesseDettaglioResponse = {
  profile: string
  commessa: string
  currentYear: number
  currentMonth: number
  anagrafica?: CommessaDettaglioAnagrafica | null
  anniStorici: CommessaDettaglioAnnoRow[]
  annoCorrenteProgressivo?: CommessaDettaglioAnnoRow | null
  mesiAnnoCorrente?: CommessaDettaglioMeseRow[]
  vendite: CommessaFatturaMovimentoRow[]
  acquisti: CommessaFatturaMovimentoRow[]
  fatturatoPivot: CommessaFatturatoPivotRow[]
  ordini?: CommessaOrdineRow[]
  offerte?: CommessaOffertaRow[]
  ricaviAnniSuccessivi?: number
  avanzamentoSalvato?: CommessaAvanzamentoRow | null
  avanzamentoStorico?: CommessaAvanzamentoRow[]
  dataConsuntivoAttivita?: string | null
  percentualeRaggiuntoProposta?: number
  requisitiOre?: CommessaRequisitoOreSummaryRow[]
  requisitiOreRisorse?: CommessaRequisitoOreRisorsaRow[]
  oreSpeseRisorse?: CommessaOreSpeseRisorsaRow[]
}

export type CommessaDettaglioConfiguraResponse = {
  profile: string
  commessa: string
  canEdit: boolean
  canEditTipologiaCommessa: boolean
  canEditProdotto: boolean
  canEditBudgetImportoInvestimento: boolean
  canEditBudgetOreInvestimento: boolean
  canEditPrezzoVenditaInizialeRcc: boolean
  canEditPrezzoVenditaFinaleRcc: boolean
  canEditStimaInizialeOrePm: boolean
  idTipoCommessa?: number | null
  tipologiaCommessa: string
  idProdotto?: number | null
  prodotto: string
  budgetImportoInvestimento: number
  budgetOreInvestimento: number
  prezzoVenditaInizialeRcc: number
  prezzoVenditaFinaleRcc: number
  stimaInizialeOrePm: number
  tipiCommessa: Array<{ id: number; label: string }>
  prodotti: Array<{ id: number; label: string }>
}

export type CommessaDettaglioConfiguraSaveRequest = {
  commessa: string
  idTipoCommessa?: number | null
  idProdotto?: number | null
  budgetImportoInvestimento: number
  budgetOreInvestimento: number
  prezzoVenditaInizialeRcc: number
  prezzoVenditaFinaleRcc: number
  stimaInizialeOrePm: number
}

export type CommessaSegnalazioneTipo = {
  id: number
  codice: string
  descrizione: string
  impattaClienteDefault: boolean
  ordineVisualizzazione: number
}

export type CommessaSegnalazione = {
  id: number
  idCommessa: number
  idTipoSegnalazione: number
  tipoCodice: string
  tipoDescrizione: string
  titolo: string
  testo: string
  priorita: number
  stato: number
  impattaCliente: boolean
  dataEvento?: string | null
  dataInserimento?: string | null
  idRisorsaInserimento?: number | null
  nomeRisorsaInserimento: string
  dataUltimaModifica?: string | null
  idRisorsaUltimaModifica?: number | null
  nomeRisorsaUltimaModifica: string
  dataChiusura?: string | null
  idRisorsaDestinataria?: number | null
  nomeRisorsaDestinataria: string
}

export type CommessaSegnalazioneMessaggio = {
  id: number
  idSegnalazione: number
  idMessaggioPadre?: number | null
  livello: number
  testo: string
  dataInserimento?: string | null
  idRisorsaInserimento?: number | null
  nomeRisorsaInserimento: string
  dataUltimaModifica?: string | null
  idRisorsaUltimaModifica?: number | null
  nomeRisorsaUltimaModifica: string
}

export type CommessaSegnalazioneDestinatarioOption = {
  roleCode: string
  roleLabel: string
  idRisorsa: number
  nomeRisorsa: string
  netUserName: string
  email: string
}

export type CommesseDettaglioSegnalazioniResponse = {
  profile: string
  commessa: string
  idCommessa: number
  tipiSegnalazione: CommessaSegnalazioneTipo[]
  destinatari: CommessaSegnalazioneDestinatarioOption[]
  segnalazioni: CommessaSegnalazione[]
  thread: CommessaSegnalazioneMessaggio[]
}

export type CommessaSegnalazioneCreateRequest = {
  commessa: string
  idTipoSegnalazione: number
  titolo: string
  testo: string
  priorita: number
  impattaCliente: boolean
  dataEvento?: string | null
  idRisorsaDestinataria?: number | null
}

export type CommessaSegnalazioneUpdateRequest = {
  idSegnalazione: number
  idTipoSegnalazione: number
  titolo: string
  testo: string
  priorita: number
  impattaCliente: boolean
  dataEvento?: string | null
  idRisorsaDestinataria?: number | null
}

export type CommessaSegnalazioneStatoRequest = {
  idSegnalazione: number
  stato: number
}

export type CommessaSegnalazioneDeleteRequest = {
  idSegnalazione: number
}

export type CommessaSegnalazioneMessaggioCreateRequest = {
  idSegnalazione: number
  idMessaggioPadre?: number | null
  testo: string
}

export type CommessaSegnalazioneMessaggioUpdateRequest = {
  idMessaggio: number
  testo: string
}

export type CommessaSegnalazioneMessaggioDeleteRequest = {
  idMessaggio: number
}

export type CommessaSintesiMailRecipient = {
  idRisorsa?: number | null
  nomeRisorsa: string
  netUserName: string
  email: string
  ruoli: string[]
  associatoCommessa: boolean
}

export type CommessaSintesiMailRoleOption = {
  roleCode: string
  label: string
  available: boolean
  emails: string[]
}

export type CommesseDettaglioSintesiMailPreviewResponse = {
  profile: string
  commessa: string
  simulatedTargetEmail: string
  suggestedSubject: string
  suggestedBodyHtml: string
  roleOptions: CommessaSintesiMailRoleOption[]
  recipients: CommessaSintesiMailRecipient[]
}

export type CommessaSintesiMailSendRequest = {
  commessa: string
  ruoli: string[]
  includeAssociatiCommessa: boolean
  oggetto: string
  corpoHtml: string
  corpoTesto: string
}

export type CommessaSintesiMailSendResponse = {
  success: boolean
  message: string
  simulatedTargetEmail: string
  selectedRoles: string[]
  includeAssociatiCommessa: boolean
  intendedRecipients: CommessaSintesiMailRecipient[]
  intendedEmails: string[]
  sentAtUtc?: string | null
}

export type CommessaFatturaMovimentoRow = {
  dataMovimento?: string | null
  numeroDocumento: string
  descrizione: string
  causale: string
  sottoconto: string
  controparte: string
  provenienza: string
  importo: number
  isFuture: boolean
  statoTemporale: string
}

export type CommessaFatturatoPivotRow = {
  anno?: number | null
  rcc: string
  totaleFatturato: string
  totaleFatturatoFuturo: string
  totaleRicavoIpotetico: string
  totaleRicavoIpoteticoPesato: string
  totaleComplessivo: string
  budget: string
  percentualeRaggiungimento: string
}

export type ProdottiGroupSummaryRow = {
  prodotto: string
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  ricaviMaturati: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
  oreFuture: number
  costoPersonaleFuturo: number
}

export type ProdottoGroup = {
  productKey: string
  summary: ProdottiGroupSummaryRow
  rows: CommessaSintesiRow[]
}

export type SintesiTableRow =
  | { kind: 'commessa'; row: CommessaSintesiRow; key: string }
  | {
    kind: 'prodotto-summary'
    row: ProdottiGroupSummaryRow
    key: string
    productKey: string
    isCollapsed: boolean
    commesseCount: number
  }

export type SintesiPersistedState = {
  profile: string
  impersonation: string
  activePage: AppPage
  mode: SintesiMode
  commessaSearch: string
  sortColumn: SortColumn
  sortDirection: SortDirection
  filters: SintesiFiltersForm
  rows: CommessaSintesiRow[]
  searched: boolean
}

