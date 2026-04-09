namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDettaglioResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string Commessa { get; set; } = string.Empty;
    public int CurrentYear { get; set; }
    public int CurrentMonth { get; set; }
    public CommessaDettaglioAnagraficaDto? Anagrafica { get; set; }
    public IReadOnlyCollection<CommessaDettaglioAnnoRowDto> AnniStorici { get; set; } = Array.Empty<CommessaDettaglioAnnoRowDto>();
    public CommessaDettaglioAnnoRowDto? AnnoCorrenteProgressivo { get; set; }
    public IReadOnlyCollection<CommessaDettaglioMeseRowDto> MesiAnnoCorrente { get; set; } = Array.Empty<CommessaDettaglioMeseRowDto>();
    public IReadOnlyCollection<CommessaFatturaMovimentoDto> Vendite { get; set; } = Array.Empty<CommessaFatturaMovimentoDto>();
    public IReadOnlyCollection<CommessaFatturaMovimentoDto> Acquisti { get; set; } = Array.Empty<CommessaFatturaMovimentoDto>();
    public IReadOnlyCollection<CommessaFatturatoPivotRowDto> FatturatoPivot { get; set; } = Array.Empty<CommessaFatturatoPivotRowDto>();
    public IReadOnlyCollection<CommessaOrdineDto> Ordini { get; set; } = Array.Empty<CommessaOrdineDto>();
    public IReadOnlyCollection<CommessaOffertaDto> Offerte { get; set; } = Array.Empty<CommessaOffertaDto>();
    public decimal RicaviAnniSuccessivi { get; set; }
    public CommessaAvanzamentoDto? AvanzamentoSalvato { get; set; }
    public IReadOnlyCollection<CommessaAvanzamentoDto> AvanzamentoStorico { get; set; } = Array.Empty<CommessaAvanzamentoDto>();
    public DateTime DataConsuntivoAttivita { get; set; }
    public decimal PercentualeRaggiuntoProposta { get; set; }
    public IReadOnlyCollection<CommessaRequisitoOreSummaryDto> RequisitiOre { get; set; } = Array.Empty<CommessaRequisitoOreSummaryDto>();
    public IReadOnlyCollection<CommessaRequisitoOreRisorsaDto> RequisitiOreRisorse { get; set; } = Array.Empty<CommessaRequisitoOreRisorsaDto>();
    public IReadOnlyCollection<CommessaOreSpeseRisorsaDto> OreSpeseRisorse { get; set; } = Array.Empty<CommessaOreSpeseRisorsaDto>();
}
