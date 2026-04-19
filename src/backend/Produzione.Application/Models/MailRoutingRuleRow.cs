namespace Produzione.Application.Models;

public sealed record MailRoutingRuleRow(
    int Id,
    string ScopeType,
    string ScopeValue,
    string Description,
    int Priority,
    bool IsActive,
    string ToRecipients,
    string CcRecipients,
    string BccRecipients,
    DateTime? UpdatedAtUtc,
    int? UpdatedByIdRisorsa);
