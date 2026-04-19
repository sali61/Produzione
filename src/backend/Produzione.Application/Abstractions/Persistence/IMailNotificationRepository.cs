using Produzione.Application.Models;

namespace Produzione.Application.Abstractions.Persistence;

public interface IMailNotificationRepository
{
    Task<MailConfigRow?> GetConfigAsync(bool includePassword, CancellationToken cancellationToken = default);
    Task<MailConfigRow> SaveConfigAsync(
        string platform,
        string server,
        int port,
        string sender,
        string? username,
        string? password,
        bool updatePassword,
        string defaultRecipient,
        bool useStartTls,
        bool useSsl,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<MailRoutingRuleRow>> GetRulesAsync(CancellationToken cancellationToken = default);
    Task<MailRoutingRuleRow> SaveRuleAsync(
        int? id,
        string scopeType,
        string? scopeValue,
        string description,
        int priority,
        bool isActive,
        string toRecipients,
        string? ccRecipients,
        string? bccRecipients,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteRuleAsync(int id, CancellationToken cancellationToken = default);
}
