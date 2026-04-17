namespace Produzione.Application.Common.Profiles;

public static class ProfileCatalog
{
    public const string Supervisore = "Supervisore";
    public const string ResponsabileProduzione = "Responsabile Produzione";
    public const string ResponsabileCommerciale = "Responsabile Commerciale";
    public const string ProjectManager = "Project Manager";
    public const string ResponsabileCommercialeCommessa = "Responsabile Commerciale Commessa";
    public const string GeneralProjectManager = "General Project Manager";
    public const string ResponsabileOu = "Responsabile OU";
    public const string RisorseUmane = "Risorse Umane";

    private static readonly IReadOnlyDictionary<string, string> Map =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["CDG"] = Supervisore,
            ["PRES"] = Supervisore,
            ["RP"] = ResponsabileProduzione,
            ["RC"] = ResponsabileCommerciale,
            ["PM"] = ProjectManager,
            ["RCC"] = ResponsabileCommercialeCommessa,
            ["GPM"] = GeneralProjectManager,
            ["HR"] = RisorseUmane,
            [Supervisore] = Supervisore,
            [ResponsabileProduzione] = ResponsabileProduzione,
            [ResponsabileCommerciale] = ResponsabileCommerciale,
            [ProjectManager] = ProjectManager,
            [ResponsabileCommercialeCommessa] = ResponsabileCommercialeCommessa,
            [GeneralProjectManager] = GeneralProjectManager,
            [ResponsabileOu] = ResponsabileOu,
            [RisorseUmane] = RisorseUmane
        };

    private static readonly IReadOnlyDictionary<string, int> OperationalPriorityMap =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            [Supervisore] = 0,
            [ResponsabileCommerciale] = 1,
            [ResponsabileProduzione] = 2,
            [ResponsabileCommercialeCommessa] = 3,
            [ResponsabileOu] = 4,
            [RisorseUmane] = 5,
            [GeneralProjectManager] = 6,
            [ProjectManager] = 7
        };

    public static IReadOnlyCollection<string> All { get; } =
    [
        Supervisore,
        ResponsabileProduzione,
        ResponsabileCommerciale,
        ProjectManager,
        ResponsabileCommercialeCommessa,
        GeneralProjectManager,
        ResponsabileOu,
        RisorseUmane
    ];

    public static string Normalize(string profile)
    {
        if (string.IsNullOrWhiteSpace(profile))
        {
            return string.Empty;
        }

        var trimmed = profile.Trim();
        return Map.TryGetValue(trimmed, out var mapped)
            ? mapped
            : trimmed;
    }

    public static bool IsKnown(string profile)
    {
        var normalized = Normalize(profile);
        return All.Contains(normalized, StringComparer.OrdinalIgnoreCase);
    }

    public static int GetOperationalPriority(string profile)
    {
        var normalized = Normalize(profile);
        if (OperationalPriorityMap.TryGetValue(normalized, out var priority))
        {
            return priority;
        }

        return int.MaxValue;
    }

    public static IReadOnlyCollection<string> OrderByOperationalPriority(IEnumerable<string> profiles)
    {
        return profiles
            .Select(Normalize)
            .Where(IsKnown)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(GetOperationalPriority)
            .ThenBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
