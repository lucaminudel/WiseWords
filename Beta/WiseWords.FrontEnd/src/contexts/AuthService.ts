import { CognitoConfig } from '../config/environment';

export interface AuthService {
  login(): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  handleCallback(): Promise<void>;
}

export class LocalAuthService implements AuthService {
  async login(): Promise<void> {
    // Local mode: no login required
  }

  async logout(): Promise<void> {
    // Local mode: no logout required
  }

  async getCurrentUser(): Promise<string | null> {
    // Local mode: no authentication, return null
    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    // Local mode: no authentication required
    return false;
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async handleCallback(): Promise<void> {
    // Local mode: no callback handling needed
  }
}

export class CognitoAuthService implements AuthService {
  constructor(private config: CognitoConfig) {}

  async login(): Promise<void> {
    const redirectUri = `${window.location.origin}/callback`;
    const hostedUIUrl = `https://${this.config.Domain}/login?client_id=${this.config.ClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    // Store current location for return after login
    sessionStorage.setItem('returnTo', window.location.pathname);
    
    window.location.href = hostedUIUrl;
  }

  async logout(): Promise<void> {
    // Clear tokens
    localStorage.removeItem('cognito_access_token');
    localStorage.removeItem('cognito_id_token');
    localStorage.removeItem('cognito_refresh_token');
    localStorage.removeItem('cognito_username');
    
    // Redirect to Cognito logout
    const redirectUri = window.location.origin;
    const logoutUrl = `https://${this.config.Domain}/logout?client_id=${this.config.ClientId}&logout_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = logoutUrl;
  }

  async getCurrentUser(): Promise<string | null> {
    return localStorage.getItem('cognito_username');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = localStorage.getItem('cognito_access_token');
    if (!token) return false;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (await this.isAuthenticated()) {
      return localStorage.getItem('cognito_access_token');
    }
    return null;
  }

  async handleCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code found in callback');
    }

    // Exchange code for tokens
    const redirectUri = `${window.location.origin}/callback`;
    const tokenEndpoint = `https://${this.config.Domain}/oauth2/token`;
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.ClientId,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code for tokens');
    }

    const tokens = await response.json();
    
    // Store tokens
    localStorage.setItem('cognito_access_token', tokens.access_token);
    localStorage.setItem('cognito_id_token', tokens.id_token);
    if (tokens.refresh_token) {
      localStorage.setItem('cognito_refresh_token', tokens.refresh_token);
    }
    
    // Extract username from ID token
    try {
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      const username = idTokenPayload.preferred_username || idTokenPayload.email;
      localStorage.setItem('cognito_username', username);
    } catch (error) {
      console.error('Failed to extract username from ID token:', error);
    }
  }
}

export function createAuthService(cognitoConfig?: CognitoConfig): AuthService {
  if (cognitoConfig?.ClientId) {
    return new CognitoAuthService(cognitoConfig);
  }
  return new LocalAuthService();
}