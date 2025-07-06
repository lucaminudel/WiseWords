using Microsoft.Extensions.Configuration;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.Tests;

public static class ApiTestConfiguration
{
    private static readonly IConfiguration Configuration;

    static ApiTestConfiguration()
    {
        Configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.test.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    /// <summary>
    /// Gets the API Gateway base URL for testing.
    /// Can be configured via:
    /// 1. Environment variable: API_GATEWAY_BASE_URL
    /// 2. appsettings.test.json: { "ApiGateway": { "BaseUrl": "..." } }
    /// 3. Default: http://127.0.0.1:3000/
    /// </summary>
    public static string BaseUrl => 
        Configuration["API_GATEWAY_BASE_URL"] ?? 
        Configuration["ApiGateway:BaseUrl"] ?? 
        "http://127.0.0.1:3000/";

    /// <summary>
    /// Gets the timeout for HTTP requests in seconds. Default is 30 seconds.
    /// </summary>
    public static int TimeoutSeconds => 
        int.TryParse(Configuration["API_GATEWAY_TIMEOUT_SECONDS"], out var timeout) ? timeout : 30;

    /// <summary>
    /// Gets whether to skip tests that require a live API (useful for CI/CD). Default is false.
    /// </summary>
    public static bool SkipLiveApiTests => 
        bool.TryParse(Configuration["SKIP_LIVE_API_TESTS"], out var skip) && skip;
}