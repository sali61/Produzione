namespace Produzione.Application.Models;

public sealed record MailConfigRow(
    int Id,
    string Platform,
    string Server,
    int Port,
    string Sender,
    string Username,
    string Password,
    string DefaultRecipient,
    bool UseStartTls,
    bool UseSsl,
    DateTime? UpdatedAtUtc,
    int? UpdatedByIdRisorsa);
