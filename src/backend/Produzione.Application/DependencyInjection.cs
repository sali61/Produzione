using Microsoft.Extensions.DependencyInjection;

namespace Produzione.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        return services;
    }
}
