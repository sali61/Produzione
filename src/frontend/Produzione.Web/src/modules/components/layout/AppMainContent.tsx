// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnalisiBuPivotFatturatoPage } from '../../pages/analisiProiezioni/AnalisiBuPivotFatturatoPage'
import { AnalisiBurccPivotFatturatoPage } from '../../pages/analisiProiezioni/AnalisiBurccPivotFatturatoPage'
import { AnalisiBurccRisultatoMensilePage } from '../../pages/analisiProiezioni/AnalisiBurccRisultatoMensilePage'
import { AnalisiBuRisultatoMensilePage } from '../../pages/analisiProiezioni/AnalisiBuRisultatoMensilePage'
import { AnalisiAlberoProiezioniPage } from '../../pages/analisiProiezioni/AnalisiAlberoProiezioniPage'
import { AnalisiDettaglioFatturatoPage } from '../../pages/analisiProiezioni/AnalisiDettaglioFatturatoPage'
import { AnalisiPianoFatturazionePage } from '../../pages/analisiProiezioni/AnalisiPianoFatturazionePage'
import { AnalisiRccPivotFatturatoPage } from '../../pages/analisiProiezioni/AnalisiRccPivotFatturatoPage'
import { AnalisiRccRisultatoMensilePage } from '../../pages/analisiProiezioni/AnalisiRccRisultatoMensilePage'
import { PrevisioniFunnelPage } from '../../pages/analisiProiezioni/PrevisioniFunnelPage'
import { PrevisioniReportFunnelBurccPage } from '../../pages/analisiProiezioni/PrevisioniReportFunnelBurccPage'
import { PrevisioniReportFunnelBuPage } from '../../pages/analisiProiezioni/PrevisioniReportFunnelBuPage'
import { PrevisioniReportFunnelRccPage } from '../../pages/analisiProiezioni/PrevisioniReportFunnelRccPage'
import { PrevisioniUtileMensileBuPage } from '../../pages/analisiProiezioni/PrevisioniUtileMensileBuPage'
import { PrevisioniUtileMensileRccPage } from '../../pages/analisiProiezioni/PrevisioniUtileMensileRccPage'
import { RisorsePage } from '../../pages/analisiRisorse/RisorsePage'
import { ProcessoOffertaPage } from '../../pages/processoOfferta/ProcessoOffertaPage'
import { CommessaDettaglioPage } from '../../pages/analisiCommesse/CommessaDettaglioPage'
import { CommesseAndamentoMensilePage } from '../../pages/analisiCommesse/CommesseAndamentoMensilePage'
import { CommesseKpiPage } from '../../pages/analisiCommesse/CommesseKpiPage'
import { CommesseAnomalePage } from '../../pages/analisiCommesse/CommesseAnomalePage'
import { CommesseDatiAnnualiAggregatiPage } from '../../pages/analisiCommesse/CommesseDatiAnnualiAggregatiPage'
import { CommesseSegnalazioniPage } from '../../pages/analisiCommesse/CommesseSegnalazioniPage'
import { SintesiOverviewPage } from '../../pages/analisiCommesse/SintesiOverviewPage'

type AppMainContentProps = any

export function AppMainContent(props: AppMainContentProps) {
  const {
    activePage,
    analisiCommessePageProps,
    commessaDettaglioPageProps,
    analisiProiezioniPageProps,
    remainingPagesProps,
    statusMessageVisible,
  } = props as any

  return (
    <main className={`content ${activePage === 'none' ? 'content-empty' : ''}`}>
      {activePage === 'none' && (
        <span className="sr-only" aria-live="polite">{statusMessageVisible}</span>
      )}

      {(activePage === 'commesse-sintesi' || activePage === 'prodotti-sintesi' || activePage === 'dati-contabili-vendita' || activePage === 'dati-contabili-acquisti') && (
        <SintesiOverviewPage {...analisiCommessePageProps} />
      )}

      {activePage === 'commesse-andamento-mensile' && (
        <CommesseAndamentoMensilePage {...analisiCommessePageProps} />
      )}

      {activePage === 'commesse-kpi' && (
        <CommesseKpiPage {...analisiCommessePageProps} />
      )}

      {activePage === 'commesse-anomale' && (
        <CommesseAnomalePage {...analisiCommessePageProps} />
      )}

      {activePage === 'commesse-segnalazioni' && (
        <CommesseSegnalazioniPage {...analisiCommessePageProps} />
      )}

      {activePage === 'commesse-dati-annuali-aggregati' && (
        <CommesseDatiAnnualiAggregatiPage {...analisiCommessePageProps} />
      )}

      {remainingPagesProps.isRisorsePage && (
        <RisorsePage {...remainingPagesProps} />
      )}

      {remainingPagesProps.isProcessoOffertaPage && (
        <ProcessoOffertaPage {...remainingPagesProps} />
      )}

      {activePage === 'analisi-rcc-risultato-mensile' && (
        <AnalisiRccRisultatoMensilePage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-rcc-pivot-fatturato' && (
        <AnalisiRccPivotFatturatoPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-bu-risultato-mensile' && (
        <AnalisiBuRisultatoMensilePage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-bu-pivot-fatturato' && (
        <AnalisiBuPivotFatturatoPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-burcc-risultato-mensile' && (
        <AnalisiBurccRisultatoMensilePage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-burcc-pivot-fatturato' && (
        <AnalisiBurccPivotFatturatoPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-piano-fatturazione' && (
        <AnalisiPianoFatturazionePage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-albero-proiezioni' && (
        <AnalisiAlberoProiezioniPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'analisi-dettaglio-fatturato' && (
        <AnalisiDettaglioFatturatoPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-funnel' && (
        <PrevisioniFunnelPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-report-funnel-rcc' && (
        <PrevisioniReportFunnelRccPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-report-funnel-bu' && (
        <PrevisioniReportFunnelBuPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-report-funnel-burcc' && (
        <PrevisioniReportFunnelBurccPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-utile-mensile-rcc' && (
        <PrevisioniUtileMensileRccPage {...analisiProiezioniPageProps} />
      )}
      {activePage === 'previsioni-utile-mensile-bu' && (
        <PrevisioniUtileMensileBuPage {...analisiProiezioniPageProps} />
      )}

      {activePage === 'commessa-dettaglio' && (
        <CommessaDettaglioPage {...commessaDettaglioPageProps} />
      )}
    </main>
  )
}
