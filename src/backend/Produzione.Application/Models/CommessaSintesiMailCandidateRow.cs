namespace Produzione.Application.Models;

public sealed record CommessaSintesiMailCandidateRow(
    string RoleCode,
    int? IdRisorsa,
    string NomeRisorsa,
    string NetUserName);
