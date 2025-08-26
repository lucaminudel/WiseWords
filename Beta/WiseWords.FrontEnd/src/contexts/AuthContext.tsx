import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js';
import { loadConfig, CognitoConfig } from '../config/environment';
import { authNavigationFlowSessionState } from '../services/authNavigationFlowSessionState';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  IsCognitoAuthEnabled: boolean;
  login: (loginReturnUrl: string, buttonId?: string) => void;
  logout: (logoutReturnUrl: string) => void;
  getIdToken: () => Promise<string | null>;
  authError: string | null; 
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
  const [authError, setAuthError] = useState<string | null>(null);
  
  const IsCognitoAuthEnabled = cognitoConfig !== null;

  // Extract username from ID token
  const extractUsernameFromToken = (idToken: string): string => {
    if (!idToken || typeof idToken !== 'string') {
      return 'user';
    }
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return payload.preferred_username || payload.name || payload.email || payload.sub || 'user';
    } catch (error) {
      return 'user';
    }
  };

  useEffect(() => {
    async function initAuth() {
      
      try {
        const config = await loadConfig();
        if (config.Cognito && config.Cognito.ClientId) {
          setCognitoConfig(config.Cognito);
          const pool = new CognitoUserPool({
            UserPoolId: config.Cognito.UserPoolId || '',
            ClientId: config.Cognito.ClientId
          });
          setUserPool(pool);
          
          const currentUser = pool.getCurrentUser();
          if (currentUser) {
            currentUser.getSession((err: any, session: CognitoUserSession) => {
              if (!err && session.isValid() && config.Cognito) {
                
                // Extract username from stored ID token
                const keyPrefix = `CognitoIdentityServiceProvider.${config.Cognito.ClientId}`;
                const storedIdToken = localStorage.getItem(`${keyPrefix}.user.idToken`);
                const extractedUsername = extractUsernameFromToken(storedIdToken || '');
                
                setIsAuthenticated(true);
                setUsername(extractedUsername);
              } else {
                setIsAuthenticated(false);
                setUsername(null);
              }
            });
          } else {
            setIsAuthenticated(false);
            setUsername(null);
          }
        } else {
          setIsAuthenticated(false);
          setUsername(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUsername(null);
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

      // Prevent re-processing the same authorization code multiple times
      const previousAuthTokenCode = authNavigationFlowSessionState.getPreviousAuthTokenCode();
      if (previousAuthTokenCode === code) {
        // Preserve triggering button id across cleanup so we can retry seamlessly
        const preservedReturnUrl = authNavigationFlowSessionState.consumeLoginReturnUrl();
        const preservedButtonId = authNavigationFlowSessionState.consumeLoginTriggeredButtonId();
        clearAuthState();
        if (preservedButtonId) {
          authNavigationFlowSessionState.setLoginReturnUrl(preservedReturnUrl!, preservedButtonId);
        }
        
        setAuthError("Temporary login error (duplicated call).");
        return;
      }

      // Exchange code for tokens using Cognito SDK
      // Use the correct redirect URI that matches Cognito configuration
      const redirectUri = window.location.origin + '/callback';
      
      authNavigationFlowSessionState.setPreviousAuthTokenCode(code);

      fetch(`https://${cognitoConfig.Domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cognitoConfig.ClientId,
          code: code,
          redirect_uri: redirectUri
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Token exchange failed with status ${response.status}`);
        }

        return response.json();
      })
      .then(tokens => {
        
        // Store tokens in localStorage for Cognito SDK
        const keyPrefix = `CognitoIdentityServiceProvider.${cognitoConfig.ClientId}`;
        localStorage.setItem(`${keyPrefix}.LastAuthUser`, tokens.id_token ? 'user' : '');
        localStorage.setItem(`${keyPrefix}.user.accessToken`, tokens.access_token);
        localStorage.setItem(`${keyPrefix}.user.idToken`, tokens.id_token);
        localStorage.setItem(`${keyPrefix}.user.refreshToken`, tokens.refresh_token);
        
        // Extract username from ID token
        const extractedUsername = extractUsernameFromToken(tokens.id_token);
        
        // Update auth state
        setIsAuthenticated(true);
        setUsername(extractedUsername);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(() => {
      });
    }
  }, [userPool, cognitoConfig]);

  const login = (loginReturnUrl: string, buttonId?: string) => {
    
    if (!cognitoConfig) {
      return;
    }

    // Store provided return URL and optional triggering button id
    authNavigationFlowSessionState.setLoginReturnUrl(loginReturnUrl, buttonId);

    // Mark flow initiated (used by CallbackPage and post-login UX)
    authNavigationFlowSessionState.markLoginInitiated();
        
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const cognitoUrl = `https://${cognitoConfig.Domain}/login?client_id=${cognitoConfig.ClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    window.location.replace(cognitoUrl);
  };

function clearAuthState() {
  // Clear all React state
  setIsAuthenticated(false);
  setUsername(null);
  setUserPool(null);

  // Remove Cognito-related localStorage keys if config is available
  if (cognitoConfig && cognitoConfig.ClientId) {
    const keyPrefix = `CognitoIdentityServiceProvider.${cognitoConfig.ClientId}`;
    localStorage.removeItem(`${keyPrefix}.LastAuthUser`);
    localStorage.removeItem(`${keyPrefix}.user.accessToken`);
    localStorage.removeItem(`${keyPrefix}.user.idToken`);
    localStorage.removeItem(`${keyPrefix}.user.refreshToken`);
  }

  // Remove sessionStorage items related to auth/navigation
  authNavigationFlowSessionState.clearEphemeral();
}

const logout = (logoutReturnUrl: string) => {

  if (!cognitoConfig) {
    return;
  }

  if (!userPool) {
    return;
  }

  // Clear all authentication state and storage
  clearAuthState();

  // Store return URL for after logout
  authNavigationFlowSessionState.setLogoutReturnUrl(logoutReturnUrl);

  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
  
  // Use callback page as logout_uri
  const logoutUri = encodeURIComponent(window.location.origin + '/callback');
  const cognitoLogoutUrl = `https://${cognitoConfig.Domain}/logout?client_id=${cognitoConfig.ClientId}&logout_uri=${logoutUri}`;

  window.location.replace(cognitoLogoutUrl);
};

  const getIdToken = async (): Promise<string | null> => {
    if (!userPool || !isAuthenticated || !cognitoConfig) return null;
    
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
        // Return ID token instead of access token
        resolve(session.getIdToken().getJwtToken());
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
      getIdToken,
      authError
    }}>
      {children}
    </AuthContext.Provider>
  );
}