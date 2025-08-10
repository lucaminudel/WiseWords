using System.Collections.Concurrent;
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

#else
            // This fallback allows IDE Tests explores to run using local_dev settings
            var environment = Environment.GetEnvironmentVariable("WISEWORDS_ENV");
            if (string.IsNullOrEmpty(environment))
                throw new InvalidOperationException("The WISEWORDS_ENV environment variable should be set (local_dev, local_integration_tests, aws_prod) but is not.");
#endif

            var configPath = Path.Combine(GetConfigDirectory(), $"env.{environment}.json");
            
            if (!File.Exists(configPath))
                throw new FileNotFoundException($"Configuration file not found: {configPath}");
                
            var jsonContent = File.ReadAllText(configPath);
            _cachedConfig = JsonSerializer.Deserialize<EnvironmentConfig>(jsonContent) 
                ?? throw new InvalidOperationException($"Failed to deserialize configuration from {configPath}");
                
            return _cachedConfig;
        }

        private static bool HasConfigFiles (string directory)
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
    
    public class EnvironmentConfig
    {
        public string ApiBaseUrl { get; set; } = string.Empty;
        public string DynamoDbServiceLocalUrl { get; set; } = string.Empty;
        public string DynamoDbServiceLocalContainerUrl { get; set; } = string.Empty;

        public string DynamoDbTableName { get; set; } = string.Empty;
        public AwsConfig AWS { get; set; } = new();
    }
    
    public class AwsConfig
    {
        public string Profile { get; set; } = string.Empty;
        public string? Region { get; set; }
    }
}