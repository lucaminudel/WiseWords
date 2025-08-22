import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js';
import { loadConfig, CognitoConfig } from '../config/environment';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  IsCognitoAuthEnabled: boolean;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [cognitoConfig, setCognitoConfig] = useState<CognitoConfig | null>(null);
  const [userPool, setUserPool] = useState<CognitoUserPool | null>(null);

  const IsCognitoAuthEnabled = cognitoConfig !== null;

  // Extract username from ID token
  const extractUsernameFromToken = (idToken: string): string => {
    if (!idToken || typeof idToken !== 'string') {
      console.log('[AuthContext] ID token is null or invalid');
      return 'user';
    }
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return payload.preferred_username || payload.name || payload.email || payload.sub || 'user';
    } catch (error) {
      console.error('[AuthContext] Failed to decode ID token:', error);
      return 'user';
    }
  };

  useEffect(() => {
    async function initAuth() {
      console.log('[AuthContext] Initializing authentication');
      try {
        const config = await loadConfig();
        if (config.Cognito && config.Cognito.ClientId) {
          console.log('[AuthContext] Cognito enabled - ClientId:', config.Cognito.ClientId);
          setCognitoConfig(config.Cognito);
          const pool = new CognitoUserPool({
            UserPoolId: config.Cognito.UserPoolId || '',
            ClientId: config.Cognito.ClientId
          });
          setUserPool(pool);
          
          const currentUser = pool.getCurrentUser();
          if (currentUser) {
            console.log('[AuthContext] Found existing user, checking session');
            currentUser.getSession((err: any, session: CognitoUserSession) => {
              if (!err && session.isValid() && config.Cognito) {
                console.log('[AuthContext] Valid session found for user:', currentUser.getUsername());
                
                // Extract username from stored ID token
                const keyPrefix = `CognitoIdentityServiceProvider.${config.Cognito.ClientId}`;
                const storedIdToken = localStorage.getItem(`${keyPrefix}.user.idToken`);
                const extractedUsername = extractUsernameFromToken(storedIdToken || '');
                console.log('[AuthContext] Extracted username from stored token:', extractedUsername);
                
                setIsAuthenticated(true);
                setUsername(extractedUsername);
              } else {
                console.log('[AuthContext] No valid session found');
              }
            });
          } else {
            console.log('[AuthContext] No existing user found');
          }
        } else {
          console.log('[AuthContext] Cognito disabled - no ClientId in config');
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization failed:', error);
      }
    }
    
    initAuth();
  }, []);

  // Process Cognito callback code
  useEffect(() => {
    if (!userPool || !cognitoConfig) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      console.log('[AuthContext] Processing callback code:', code);
      
      // Exchange code for tokens using Cognito SDK
      fetch(`https://${cognitoConfig.Domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cognitoConfig.ClientId,
          code: code,
          redirect_uri: window.location.origin + '/callback'
        })
      })
      .then(response => response.json())
      .then(tokens => {
        console.log('[AuthContext] Received tokens, setting up session');
        
        // Store tokens in localStorage for Cognito SDK
        const keyPrefix = `CognitoIdentityServiceProvider.${cognitoConfig.ClientId}`;
        localStorage.setItem(`${keyPrefix}.LastAuthUser`, tokens.id_token ? 'user' : '');
        localStorage.setItem(`${keyPrefix}.user.accessToken`, tokens.access_token);
        localStorage.setItem(`${keyPrefix}.user.idToken`, tokens.id_token);
        localStorage.setItem(`${keyPrefix}.user.refreshToken`, tokens.refresh_token);
        
        // Extract username from ID token
        const extractedUsername = extractUsernameFromToken(tokens.id_token);
        console.log('[AuthContext] Extracted username:', extractedUsername);
        
        // Update auth state
        setIsAuthenticated(true);
        setUsername(extractedUsername);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(error => {
        console.error('[AuthContext] Token exchange failed:', error);
      });
    }
  }, [userPool, cognitoConfig]);

  const login = () => {
    console.log('[WiseWords v1.4] Starting login flow');
    if (!cognitoConfig) {
      console.log('[AuthContext] Login called but no Cognito config available');
      return;
    }
    
    // Store current URL for return after login
    sessionStorage.setItem('returnUrl', window.location.href);
    console.log('[AuthContext] Stored return URL:', window.location.href);
    
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const cognitoUrl = `https://${cognitoConfig.Domain}/login?client_id=${cognitoConfig.ClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    console.log('[AuthContext] Redirecting to Cognito login:', cognitoUrl);
    window.location.href = cognitoUrl;
  };

  const logout = () => {
    if (!userPool) return;
    
    console.log('[AuthContext] Logging out user');
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.clear();
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!userPool || !isAuthenticated) return null;
    
    return new Promise((resolve) => {
      const currentUser = userPool.getCurrentUser();
      if (!currentUser) {
        resolve(null);
        return;
      }
      
      currentUser.getSession((err: any, session: CognitoUserSession) => {
        if (err || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve(session.getAccessToken().getJwtToken());
      });
    });
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      username,
      IsCognitoAuthEnabled,
      login,
      logout,
      getAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}