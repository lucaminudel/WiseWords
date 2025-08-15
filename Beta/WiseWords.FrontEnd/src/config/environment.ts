export interface EnvironmentConfig {
  WebAppBaseUrl: string;
  ApiBaseUrl: string;
  DynamoDbServiceUrl: string;
  DynamoDbTableName: string;
  AWS: {
    Profile: string;
    Region: string | null;
  };
}

let cachedConfig: EnvironmentConfig | null = null;

export async function loadConfig(): Promise<EnvironmentConfig> {
  if (cachedConfig) return cachedConfig;
  
  const environment = (import.meta as any).env.WISEWORDS_ENV as string;
  
  if (!environment) {
    throw new Error('WISEWORDS_ENV environment variable is not set. Please set it to one of: local_dev, aws_prod, local_integration_tests');
  }
  
  const validEnvironments = ['local_dev', 'aws_prod', 'local_integration_tests'];
  if (!validEnvironments.includes(environment)) {
    throw new Error(`Invalid WISEWORDS_ENV value: '${environment}'. Must be one of: ${validEnvironments.join(', ')}`);
  }
  
  try {
    const response = await fetch(`/assets/env.${environment}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load configuration file for environment '${environment}'. HTTP status: ${response.status}. Make sure the config file exists and is accessible.`);
    }
    
    cachedConfig = await response.json() as EnvironmentConfig;
    return cachedConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Configuration loading failed for environment '${environment}': ${error.message}`);
    }
    throw new Error(`Unknown error loading configuration for environment '${environment}'`);
  }
}