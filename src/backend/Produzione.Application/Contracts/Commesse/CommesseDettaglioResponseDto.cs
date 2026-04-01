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
    public IReadOnlyCollection<CommessaFatturaMovimentoDto> Vendite { get; set; } = Array.Empty<CommessaFatturaMovimentoDto>();
    public IReadOnlyCollection<CommessaFatturaMovimentoDto> Acquisti { get; set; } = Array.Empty<CommessaFatturaMovimentoDto>();
    public IReadOnlyCollection<CommessaFatturatoPivotRowDto> FatturatoPivot { get; set; } = Array.Empty<CommessaFatturatoPivotRowDto>();
}
