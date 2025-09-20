using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;

namespace WiseWords.ConversationsAndPosts.DataStore.Configuration
{
    public class Loader
    {
        private EnvironmentConfig? _cachedConfig;

        public EnvironmentConfig GetEnvironmentVariables()
        {
            if (_cachedConfig != null)
                return _cachedConfig;

#if DEBUG
            // This fallback allows IDE Tests explores to run using local_dev settings
            var environment = Environment.GetEnvironmentVariable("WISEWORDS_ENV") ?? "local_dev";
            Console.WriteLine($"Environment variable WISEWORDS_ENV: {Environment.GetEnvironmentVariable("WISEWORDS_ENV") ?? "not set, defaulting to " + environment}");
#else
            var environment = Environment.GetEnvironmentVariable("WISEWORDS_ENV");
            if (string.IsNullOrEmpty(environment))
                throw new InvalidOperationException("The WISEWORDS_ENV environment variable should be set (local_dev, local_integration_tests, aws_prod) but is not.");
#endif

            var configPath = Path.Combine(GetConfigDirectory(), $"env.{environment}.json");

            if (!File.Exists(configPath))
                throw new FileNotFoundException($"Configuration file not found: {configPath}");

            var jsonContent = File.ReadAllText(configPath);
            var deserialisedConfigFile = JsonSerializer.Deserialize<EnvironmentConfigDeserialisation>(jsonContent)
                ?? throw new InvalidOperationException($"Failed to deserialize configuration from {configPath}");

            _cachedConfig = new EnvironmentConfig(deserialisedConfigFile);

            return _cachedConfig;
        }

        private static bool HasConfigFiles(string directory)
        {
            return Directory.GetFiles(directory, "env.*.json").Any();
        }
        private static string GetConfigDirectory()
        {
            // For Lambda/SAM: Look for config files in the same directory as the assembly
            var assemblyDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
            if (!string.IsNullOrEmpty(assemblyDir) && Directory.Exists(assemblyDir) && HasConfigFiles(assemblyDir))
                return assemblyDir;

            // Second try: current working directory
            var currentDirectory = Directory.GetCurrentDirectory();
            if (Directory.Exists(currentDirectory) && HasConfigFiles(currentDirectory))
                return currentDirectory;

            // Third try: navigate up from current directory 
            var parentDir = Directory.GetParent(currentDirectory)?.Parent;

            if (parentDir != null && HasConfigFiles(parentDir.ToString()))
            {
                return parentDir.ToString();
            }

            throw new DirectoryNotFoundException($"Config directory not found. Searched in assembly dir: {assemblyDir}, current dir: {currentDirectory}");
        }

    }

    internal class EnvironmentConfigDeserialisation
    {
        public string ApiBaseUrl { get; set; } = string.Empty;
        public string DynamoDbServiceLocalUrl { get; set; } = string.Empty;
        public string DynamoDbServiceLocalContainerUrl { get; set; } = string.Empty;

        public AwsConfigDeserialisation AWS { get; set; } = new();
        public CognitoConfigDeserialisation? Cognito { get; set; }
    }

    internal class AwsConfigDeserialisation
    {
        public string Profile { get; set; } = string.Empty;
        public string? Region { get; set; }
    }

    internal class CognitoConfigDeserialisation
    {
        public string UserPoolId { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
        public string IdentityPoolId { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
    }
    
    public class EnvironmentConfig
    {
        internal EnvironmentConfig(EnvironmentConfigDeserialisation cfg)
        {
            ValidateConfigFileInfo(cfg);

            ApiBaseUrl = new Uri(cfg.ApiBaseUrl);

            if (!string.IsNullOrEmpty(cfg.DynamoDbServiceLocalUrl))
                DynamoDbServiceLocalUrl = new Uri(cfg.DynamoDbServiceLocalUrl);

            if (!string.IsNullOrEmpty(cfg.DynamoDbServiceLocalContainerUrl))
                DynamoDbServiceLocalContainerUrl = new Uri(cfg.DynamoDbServiceLocalContainerUrl);

            AWS.Profile = cfg.AWS.Profile;

            if (!string.IsNullOrEmpty(cfg.AWS.Region))
                AWS.Region = Amazon.RegionEndpoint.GetBySystemName(cfg.AWS.Region);

            if (cfg.Cognito != null)
            {
                Cognito = new CognitoConfig
                {
                    UserPoolId = cfg.Cognito.UserPoolId,
                    ClientId = cfg.Cognito.ClientId,
                    IdentityPoolId = cfg.Cognito.IdentityPoolId,
                    Region = cfg.Cognito.Region,
                    Domain = cfg.Cognito.Domain
                };
            }

        }

        private static void ValidateConfigFileInfo(EnvironmentConfigDeserialisation cfg)
        {
            if (cfg.ApiBaseUrl == null)
                throw new ArgumentNullException($"{nameof(cfg.ApiBaseUrl)} configuration value cannot be null.");

            if (false == Uri.IsWellFormedUriString(cfg.ApiBaseUrl, UriKind.Absolute))
                throw new ArgumentNullException($"{nameof(cfg.ApiBaseUrl)} configuration value need to be a well formed Url ('{cfg.ApiBaseUrl}').");

            if (!string.IsNullOrEmpty(cfg.DynamoDbServiceLocalUrl) && !Uri.IsWellFormedUriString(cfg.DynamoDbServiceLocalUrl, UriKind.Absolute))
                throw new ArgumentNullException($"{nameof(cfg.DynamoDbServiceLocalUrl)} configuration value need to be either empty or a well formed Url. But is: '{cfg.DynamoDbServiceLocalUrl}'.");

            if (!string.IsNullOrEmpty(cfg.DynamoDbServiceLocalContainerUrl) && !Uri.IsWellFormedUriString(cfg.DynamoDbServiceLocalContainerUrl, UriKind.Absolute))
                throw new ArgumentNullException($"{nameof(cfg.DynamoDbServiceLocalContainerUrl)} configuration value need to be either empty or a well formed Url. But is: '{cfg.DynamoDbServiceLocalContainerUrl}'.");

            if (!string.IsNullOrEmpty(cfg.AWS.Region) && !Amazon.RegionEndpoint.EnumerableAllRegions.Any(region =>
                 region.SystemName.Equals(cfg.AWS.Region, StringComparison.OrdinalIgnoreCase)))
                throw new ArgumentException($"{nameof(cfg.AWS.Region)} configuration value must be empty or valid AWS Region. But is: '{cfg.AWS.Region}'.");

            if (string.IsNullOrEmpty(cfg.DynamoDbServiceLocalUrl) && string.IsNullOrEmpty(cfg.AWS.Region))
                throw new ArgumentException($"Configuration parameters {nameof(cfg.DynamoDbServiceLocalUrl)} and {nameof(cfg.AWS.Region)} cannot both be empty.");

            if (!string.IsNullOrEmpty(cfg.DynamoDbServiceLocalUrl) && !string.IsNullOrEmpty(cfg.AWS.Region))
                throw new ArgumentException($"Configuration parameters {nameof(cfg.DynamoDbServiceLocalUrl)} and {nameof(cfg.AWS.Region)} cannot be both specified. But are: '{cfg.DynamoDbServiceLocalUrl}' and '{cfg.AWS.Region}'.");

            if (string.IsNullOrEmpty(cfg.DynamoDbServiceLocalUrl) != string.IsNullOrEmpty(cfg.DynamoDbServiceLocalContainerUrl))
                throw new ArgumentException($"Configuration parameters {nameof(cfg.DynamoDbServiceLocalUrl)} and {nameof(cfg.DynamoDbServiceLocalContainerUrl)} cannot both be empty or both specified. But are: '{cfg.DynamoDbServiceLocalUrl}' and '{cfg.DynamoDbServiceLocalContainerUrl}'.");
        }

        public Uri? ApiBaseUrl { get; internal set; } = null;
        public Uri? DynamoDbServiceLocalUrl { get; internal set; } = null;
        public Uri? DynamoDbServiceLocalContainerUrl { get; internal set; } = null;

        public AwsConfig AWS { get; internal set; } = new();
        public CognitoConfig? Cognito { get; internal set; }
    }
    
    public class AwsConfig
    {
        public string Profile { get; internal set; } = string.Empty;
        public Amazon.RegionEndpoint? Region { get; internal set; }
    }

    public class CognitoConfig
    {
        public string UserPoolId { get; internal set; } = string.Empty;
        public string ClientId { get; internal set; } = string.Empty;
        public string IdentityPoolId { get; internal set; } = string.Empty;
        public string Region { get; internal set; } = string.Empty;
        public string Domain { get; internal set; } = string.Empty;
    }

}