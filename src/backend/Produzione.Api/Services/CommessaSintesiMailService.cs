using System.Net;
using System.Net.Mail;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Net.Mime;
using Microsoft.Extensions.Configuration;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Contracts.Commesse;
using Produzione.Application.Models;

namespace Produzione.Api.Services;

public interface ICommessaSintesiMailService
{
    Task<CommesseDettaglioSintesiMailPreviewResponseDto> BuildPreviewAsync(
        string profile,
        string commessa,
        CancellationToken cancellationToken = default);

    Task<CommessaSintesiMailSendResponseDto> SendAsync(
        string profile,
        CommessaSintesiMailSendRequestDto request,
        CommessaSintesiMailSendOptions? options = null,
        CancellationToken cancellationToken = default);
}

public sealed record CommessaSintesiMailSendOptions(
    string? CommessaDetailUrl = null,
    byte[]? PdfAttachment = null,
    string? PdfAttachmentFileName = null);

public sealed class CommessaSintesiMailService(
    ICommesseFilterRepository commesseFilterRepository,
    IConfiguration configuration,
    ILogger<CommessaSintesiMailService> logger) : ICommessaSintesiMailService
{
    private const string AssociatiRoleCode = "ASSOCIATI";

    private static readonly string[] OrderedRoleCodes =
    [
        "RCC",
        "RP",
        "PM",
        "ROU",
        "RC",
        "CDG"
    ];

    private static readonly IReadOnlyDictionary<string, string> RoleLabels =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["RCC"] = "Responsabile Commerciale Commessa (RCC)",
            ["RP"] = "Responsabile Produzione (RP)",
            ["PM"] = "Project Manager (PM)",
            ["ROU"] = "Responsabile OU (ROU)",
            ["RC"] = "Responsabile Commerciale (RC)",
            ["CDG"] = "Controllo di Gestione (CDG)"
        };

    public async Task<CommesseDettaglioSintesiMailPreviewResponseDto> BuildPreviewAsync(
        string profile,
        string commessa,
        CancellationToken cancellationToken = default)
    {
        var normalizedCommessa = (commessa ?? string.Empty).Trim();
        var recipients = await ResolveRecipientsAsync(normalizedCommessa, cancellationToken);
        var roleOptions = OrderedRoleCodes
            .Select(roleCode =>
            {
                var emails = recipients
                    .Where(item => item.Ruoli.Contains(roleCode, StringComparer.OrdinalIgnoreCase))
                    .Select(item => item.Email)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                return new CommessaSintesiMailRoleOptionDto
                {
                    RoleCode = roleCode,
                    Label = RoleLabels.TryGetValue(roleCode, out var label) ? label : roleCode,
                    Available = emails.Length > 0,
                    Emails = emails
                };
            })
            .ToArray();

        return new CommesseDettaglioSintesiMailPreviewResponseDto
        {
            Profile = profile,
            Commessa = normalizedCommessa,
            SimulatedTargetEmail = string.Empty,
            SuggestedSubject = $"[Produzione] Sintesi commessa {normalizedCommessa}",
            SuggestedBodyHtml = BuildSuggestedBodyHtml(normalizedCommessa),
            RoleOptions = roleOptions,
            Recipients = recipients
        };
    }

    public async Task<CommessaSintesiMailSendResponseDto> SendAsync(
        string profile,
        CommessaSintesiMailSendRequestDto request,
        CommessaSintesiMailSendOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedCommessa = (request.Commessa ?? string.Empty).Trim();
        var normalizedRoles = (request.Ruoli ?? Array.Empty<string>())
            .Select(NormalizeRoleCode)
            .Where(role => OrderedRoleCodes.Contains(role, StringComparer.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var recipients = await ResolveRecipientsAsync(normalizedCommessa, cancellationToken);
        var intendedRecipients = recipients
            .Where(item =>
                item.Ruoli.Any(role => normalizedRoles.Contains(role, StringComparer.OrdinalIgnoreCase)) ||
                (request.IncludeAssociatiCommessa && item.AssociatoCommessa))
            .GroupBy(item => item.Email, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var first = group.First();
                return new CommessaSintesiMailRecipientDto
                {
                    IdRisorsa = first.IdRisorsa,
                    NomeRisorsa = first.NomeRisorsa,
                    NetUserName = first.NetUserName,
                    Email = first.Email,
                    Ruoli = group
                        .SelectMany(item => item.Ruoli)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
                        .ToArray(),
                    AssociatoCommessa = group.Any(item => item.AssociatoCommessa)
                };
            })
            .OrderBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Email, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var intendedEmails = intendedRecipients
            .Select(item => item.Email)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(item => item, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (intendedEmails.Length == 0)
        {
            return new CommessaSintesiMailSendResponseDto
            {
                Success = false,
                Message = "Nessun destinatario email valido per la selezione corrente.",
                SimulatedTargetEmail = string.Empty,
                SelectedRoles = normalizedRoles,
                IncludeAssociatiCommessa = request.IncludeAssociatiCommessa,
                IntendedRecipients = intendedRecipients,
                IntendedEmails = intendedEmails,
                SentAtUtc = DateTime.UtcNow
            };
        }

        var mailSubject = (request.Oggetto ?? string.Empty).Trim();
            var bodyHtml = BuildFinalBodyHtml(
                request.CorpoHtml,
                request.CorpoTesto,
                normalizedCommessa,
                options?.CommessaDetailUrl);
            var bodyText = BuildPlainTextBody(bodyHtml);

        if (!TryReadMailSettings(configuration, out var mailSettings, out var mailConfigError))
        {
            return new CommessaSintesiMailSendResponseDto
            {
                Success = false,
                Message = mailConfigError,
                SimulatedTargetEmail = string.Empty,
                SelectedRoles = normalizedRoles,
                IncludeAssociatiCommessa = request.IncludeAssociatiCommessa,
                IntendedRecipients = intendedRecipients,
                IntendedEmails = intendedEmails,
                SentAtUtc = DateTime.UtcNow
            };
        }

        try
        {
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(mailSettings.Sender),
                Subject = string.IsNullOrWhiteSpace(mailSubject)
                    ? $"[Produzione] Sintesi commessa {normalizedCommessa}"
                    : mailSubject,
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8
            };

            foreach (var email in intendedEmails)
            {
                mailMessage.To.Add(email);
            }

            // Invia esplicitamente entrambe le versioni (plain + html) per evitare che
            // alcuni client renderizzino il markup HTML come testo.
            var normalizedHtmlBody = string.IsNullOrWhiteSpace(bodyHtml)
                ? ConvertPlainTextToHtml(bodyText)
                : EnsureHtmlDocument(bodyHtml);

            mailMessage.IsBodyHtml = false;
            mailMessage.Body = bodyText;
            mailMessage.AlternateViews.Add(
                AlternateView.CreateAlternateViewFromString(
                    bodyText,
                    Encoding.UTF8,
                    MediaTypeNames.Text.Plain));
            mailMessage.AlternateViews.Add(
                AlternateView.CreateAlternateViewFromString(
                    normalizedHtmlBody,
                    Encoding.UTF8,
                    MediaTypeNames.Text.Html));

            if (options?.PdfAttachment is { Length: > 0 })
            {
                var safeFileName = string.IsNullOrWhiteSpace(options.PdfAttachmentFileName)
                    ? $"Produzione_Dettaglio_{normalizedCommessa}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf"
                    : options.PdfAttachmentFileName.Trim();

                var attachmentStream = new MemoryStream(options.PdfAttachment);
                var attachment = new Attachment(attachmentStream, safeFileName, "application/pdf");
                mailMessage.Attachments.Add(attachment);
            }

            using var smtpClient = new SmtpClient(mailSettings.Server, mailSettings.Port)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                EnableSsl = mailSettings.UseSsl,
                UseDefaultCredentials = false
            };

            if (!string.IsNullOrWhiteSpace(mailSettings.Username) &&
                !string.IsNullOrWhiteSpace(mailSettings.Password))
            {
                smtpClient.Credentials = new NetworkCredential(mailSettings.Username, mailSettings.Password);
            }
            else if (!string.IsNullOrWhiteSpace(mailSettings.Username) &&
                     string.IsNullOrWhiteSpace(mailSettings.Password))
            {
                logger.LogWarning(
                    "COMMESSA_SINTESI_MAIL_WARNING | SMTP username configurato senza password: invio senza autenticazione SMTP. Username={Username}",
                    mailSettings.Username);
            }

            await smtpClient.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "COMMESSA_SINTESI_MAIL_ERROR | Commessa={Commessa} | Profile={Profile} | Ruoli={Ruoli} | IncludeAssociati={IncludeAssociati} | Destinatari={Destinatari} | Oggetto={Oggetto}",
                normalizedCommessa,
                profile,
                string.Join(",", normalizedRoles),
                request.IncludeAssociatiCommessa,
                string.Join(",", intendedEmails),
                mailSubject);

            return new CommessaSintesiMailSendResponseDto
            {
                Success = false,
                Message = $"Invio email non riuscito: {ex.Message}",
                SimulatedTargetEmail = string.Empty,
                SelectedRoles = normalizedRoles,
                IncludeAssociatiCommessa = request.IncludeAssociatiCommessa,
                IntendedRecipients = intendedRecipients,
                IntendedEmails = intendedEmails,
                SentAtUtc = DateTime.UtcNow
            };
        }

        logger.LogInformation(
            "COMMESSA_SINTESI_MAIL_SENT | Commessa={Commessa} | Profile={Profile} | Ruoli={Ruoli} | IncludeAssociati={IncludeAssociati} | Destinatari={Destinatari} | Oggetto={Oggetto}",
            normalizedCommessa,
            profile,
            string.Join(",", normalizedRoles),
            request.IncludeAssociatiCommessa,
            string.Join(",", intendedEmails),
            mailSubject);

        return new CommessaSintesiMailSendResponseDto
        {
            Success = true,
            Message = $"Email inviata a {intendedEmails.Length} destinatari.",
            SimulatedTargetEmail = string.Empty,
            SelectedRoles = normalizedRoles,
            IncludeAssociatiCommessa = request.IncludeAssociatiCommessa,
            IntendedRecipients = intendedRecipients,
            IntendedEmails = intendedEmails,
            SentAtUtc = DateTime.UtcNow
        };
    }

    private static bool TryReadMailSettings(
        IConfiguration configuration,
        out MailSettings settings,
        out string error)
    {
        var server = ReadConfigValue(configuration, "Mail:Server", "Smtp:Server");
        var sender = ReadConfigValue(configuration, "Mail:Sender", "Mail:From", "Smtp:Sender");
        var port = ReadConfigInt(configuration, 25, "Mail:Port", "Smtp:Port");
        var username = ReadConfigValue(configuration, "Mail:Username", "Smtp:Username");
        var password = ReadConfigValue(configuration, "Mail:Password", "Smtp:Password");
        var useSsl = ReadConfigBool(configuration, false, "Mail:UseSsl", "Smtp:UseSsl");
        var useStartTls = ReadConfigBool(configuration, false, "Mail:UseStartTls", "Smtp:UseStartTls");

        if (string.IsNullOrWhiteSpace(server))
        {
            settings = default;
            error = "Configurazione mail mancante: valorizzare Mail:Server.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(sender))
        {
            sender = "SistemaProduzione@xeniaprogetti.it";
        }
        else
        {
            // Il mittente per questo workflow resta sempre la mailbox di sistema.
            sender = "SistemaProduzione@xeniaprogetti.it";
        }

        settings = new MailSettings(
            server.Trim(),
            port <= 0 ? 25 : port,
            sender.Trim(),
            username.Trim(),
            password,
            useSsl || useStartTls);
        error = string.Empty;
        return true;
    }

    private static string ReadConfigValue(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key];
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static int ReadConfigInt(IConfiguration configuration, int fallback, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (int.TryParse(configuration[key], out var value))
            {
                return value;
            }
        }

        return fallback;
    }

    private static bool ReadConfigBool(IConfiguration configuration, bool fallback, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (bool.TryParse(configuration[key], out var value))
            {
                return value;
            }
        }

        return fallback;
    }

    private async Task<CommessaSintesiMailRecipientDto[]> ResolveRecipientsAsync(
        string commessa,
        CancellationToken cancellationToken)
    {
        var candidates = await commesseFilterRepository.GetCommessaSintesiMailCandidatesAsync(commessa, cancellationToken);
        var recipientsByEmail = new Dictionary<string, RecipientAccumulator>(StringComparer.OrdinalIgnoreCase);

        foreach (var candidate in candidates)
        {
            var normalizedRole = NormalizeRoleCode(candidate.RoleCode);
            if (!OrderedRoleCodes.Contains(normalizedRole, StringComparer.OrdinalIgnoreCase) &&
                !string.Equals(normalizedRole, AssociatiRoleCode, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var normalizedUsername = NormalizeNetUserName(candidate.NetUserName);
            var resolvedEmail = ResolveEmailFromUsername(normalizedUsername);
            if (string.IsNullOrWhiteSpace(resolvedEmail))
            {
                continue;
            }

            if (!recipientsByEmail.TryGetValue(resolvedEmail, out var accumulator))
            {
                accumulator = new RecipientAccumulator(resolvedEmail);
                recipientsByEmail[resolvedEmail] = accumulator;
            }

            accumulator.IdRisorsa ??= candidate.IdRisorsa;
            accumulator.NomeRisorsa = ResolvePreferredValue(accumulator.NomeRisorsa, candidate.NomeRisorsa);
            accumulator.NetUserName = ResolvePreferredValue(accumulator.NetUserName, normalizedUsername);

            if (string.Equals(normalizedRole, AssociatiRoleCode, StringComparison.OrdinalIgnoreCase))
            {
                accumulator.AssociatoCommessa = true;
            }
            else
            {
                accumulator.Ruoli.Add(normalizedRole);
            }
        }

        return recipientsByEmail.Values
            .Select(item => new CommessaSintesiMailRecipientDto
            {
                IdRisorsa = item.IdRisorsa,
                NomeRisorsa = string.IsNullOrWhiteSpace(item.NomeRisorsa)
                    ? item.Email
                    : item.NomeRisorsa,
                NetUserName = item.NetUserName,
                Email = item.Email,
                Ruoli = item.Ruoli
                    .OrderBy(role => role, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                AssociatoCommessa = item.AssociatoCommessa
            })
            .OrderBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Email, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string BuildSuggestedBodyHtml(string commessa)
    {
        return $"""
            <p>Buongiorno,</p>
            <p>in allegato la sintesi aggiornata della commessa <strong>{System.Net.WebUtility.HtmlEncode(commessa)}</strong>.</p>
            <p>Puoi rispondere a questa mail per eventuali approfondimenti.</p>
            <p>Grazie.</p>
            """;
    }

    private static string NormalizeRoleCode(string? roleCode)
    {
        var normalized = (roleCode ?? string.Empty).Trim().ToUpperInvariant();
        if (normalized == "PRES")
        {
            return "RC";
        }

        return normalized;
    }

    private static string NormalizeNetUserName(string? netUserName)
    {
        var normalized = (netUserName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        normalized = normalized.Replace('/', '\\');
        var slashIndex = normalized.LastIndexOf('\\');
        if (slashIndex >= 0 && slashIndex < normalized.Length - 1)
        {
            normalized = normalized[(slashIndex + 1)..];
        }

        return normalized.Trim();
    }

    private static string ResolveEmailFromUsername(string normalizedUsername)
    {
        if (string.IsNullOrWhiteSpace(normalizedUsername))
        {
            return string.Empty;
        }

        var candidate = normalizedUsername.Trim();
        if (!candidate.Contains('@', StringComparison.Ordinal))
        {
            candidate = $"{candidate}@xeniaprogetti.it";
        }

        try
        {
            var mailAddress = new MailAddress(candidate);
            return mailAddress.Address.Trim().ToLowerInvariant();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string ResolvePreferredValue(string current, string candidate)
    {
        if (!string.IsNullOrWhiteSpace(current))
        {
            return current;
        }

        return (candidate ?? string.Empty).Trim();
    }

    private static string SanitizeBodyHtml(string? rawHtml)
    {
        if (string.IsNullOrWhiteSpace(rawHtml))
        {
            return string.Empty;
        }

        var sanitized = rawHtml.Replace("<script", "&lt;script", StringComparison.OrdinalIgnoreCase)
            .Replace("</script>", "&lt;/script&gt;", StringComparison.OrdinalIgnoreCase);
        return sanitized.Trim();
    }

    private static string BuildFinalBodyHtml(
        string? requestedBodyHtml,
        string? requestedBodyText,
        string commessa,
        string? commessaDetailUrl)
    {
        string normalizedBodyHtml;

        if (!string.IsNullOrWhiteSpace(requestedBodyHtml))
        {
            normalizedBodyHtml = SanitizeBodyHtml(requestedBodyHtml);

            // Alcuni client/editor inviano HTML entity-encoded (es. &lt;p&gt;).
            var decodedHtml = DecodeHtmlRepeatedly(normalizedBodyHtml);
            if (!string.IsNullOrWhiteSpace(decodedHtml) &&
                decodedHtml.Contains('<', StringComparison.Ordinal) &&
                decodedHtml.Contains('>', StringComparison.Ordinal))
            {
                normalizedBodyHtml = decodedHtml.Trim();
            }
            else if (!string.IsNullOrWhiteSpace(decodedHtml))
            {
                normalizedBodyHtml = ConvertPlainTextToHtml(decodedHtml);
            }
        }
        else if (!string.IsNullOrWhiteSpace(requestedBodyText))
        {
            normalizedBodyHtml = ConvertPlainTextToHtml(requestedBodyText);
        }
        else
        {
            normalizedBodyHtml = BuildSuggestedBodyHtml(commessa);
        }

        var normalizedLink = DecodeHtmlRepeatedly((commessaDetailUrl ?? string.Empty).Trim());
        if (!string.IsNullOrWhiteSpace(normalizedLink))
        {
            var containsLink = normalizedBodyHtml.Contains(normalizedLink, StringComparison.OrdinalIgnoreCase);
            if (!containsLink)
            {
                var encodedLink = System.Net.WebUtility.HtmlEncode(normalizedLink);
                normalizedBodyHtml +=
                    $"""<p>Apri la scheda commessa: <a href="{encodedLink}">{encodedLink}</a></p>""";
            }
        }

        return normalizedBodyHtml.Trim();
    }

    private static string DecodeHtmlRepeatedly(string value)
    {
        var current = value ?? string.Empty;
        for (var i = 0; i < 3; i += 1)
        {
            var decoded = System.Net.WebUtility.HtmlDecode(current);
            if (string.Equals(decoded, current, StringComparison.Ordinal))
            {
                break;
            }

            current = decoded;
        }

        return current;
    }

    private static string ConvertPlainTextToHtml(string plainText)
    {
        var normalized = (plainText ?? string.Empty).Trim();
        if (normalized.Length == 0)
        {
            return string.Empty;
        }

        var encoded = System.Net.WebUtility.HtmlEncode(normalized);
        var withLineBreaks = Regex.Replace(encoded, @"\r\n|\r|\n", "<br/>");
        return $"<p>{withLineBreaks}</p>";
    }

    private static string EnsureHtmlDocument(string htmlBody)
    {
        var normalized = (htmlBody ?? string.Empty).Trim();
        if (normalized.Length == 0)
        {
            return string.Empty;
        }

        if (normalized.Contains("<html", StringComparison.OrdinalIgnoreCase))
        {
            return normalized;
        }

        return $"""
            <!doctype html>
            <html lang="it">
            <head>
              <meta charset="utf-8" />
            </head>
            <body>
            {normalized}
            </body>
            </html>
            """;
    }

    private static string BuildPlainTextBody(string htmlBody)
    {
        var plain = StripHtml(htmlBody);
        if (string.IsNullOrWhiteSpace(plain))
        {
            return string.Empty;
        }

        // Evita link con "&amp;" quando il client usa la vista plain text.
        return plain.Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase);
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var withoutTags = System.Text.RegularExpressions.Regex.Replace(html, "<.*?>", " ");
        return System.Net.WebUtility.HtmlDecode(withoutTags).Trim();
    }

    private sealed class RecipientAccumulator(string email)
    {
        public string Email { get; } = email;
        public int? IdRisorsa { get; set; }
        public string NomeRisorsa { get; set; } = string.Empty;
        public string NetUserName { get; set; } = string.Empty;
        public bool AssociatoCommessa { get; set; }
        public HashSet<string> Ruoli { get; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private readonly record struct MailSettings(
        string Server,
        int Port,
        string Sender,
        string Username,
        string Password,
        bool UseSsl);
}
