using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Infrastructure.Repositories;

namespace Produzione.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("XeniaDB")
            ?? configuration.GetConnectionString("DefaultConnection");

        services.AddSingleton<ICommesseFilterRepository>(_ =>
            new CommesseFilterRepository(connectionString));

        return services;
    }
}
