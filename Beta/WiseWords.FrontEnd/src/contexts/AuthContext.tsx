import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js';
import { loadConfig, CognitoConfig } from '../config/environment';
import { authNavigationFlowSessionState } from '../services/authNavigationFlowSessionState';

interface AuthContextType {
  processAuthCallbackIfPresent: () => Promise<void>;
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
  
  const IsCognitoAuthEnabled = cognitoConfig !== null && cognitoConfig.ClientId !== '';

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
                if (storedIdToken) {
                  const extractedUsername = extractUsernameFromToken(storedIdToken);
                  setIsAuthenticated(true);
                  setUsername(extractedUsername);
                } else {
                  setIsAuthenticated(false);
                  setUsername(null);
                }
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
          // Check for mock auth
          const mockAuth = localStorage.getItem('mockAuth');
          if (mockAuth) {
            try {
              const { username } = JSON.parse(mockAuth);
              setIsAuthenticated(true);
              setUsername(username);
            } catch (e) {
              console.error('Error parsing mock auth data', e);
            }
          } else {
            setIsAuthenticated(false);
            setUsername(null);
          }
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUsername(null);
      }
    }
    
    initAuth();
  }, []);

  // Process Cognito callback code now exposed as a callable function
  const processAuthCallbackIfPresent = async (): Promise<void> => {

    if (!userPool || !cognitoConfig) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Check for uncomplete authentication
    const keyPrefix = `CognitoIdentityServiceProvider.${cognitoConfig.ClientId}`;
    const storedIdToken = localStorage.getItem(`${keyPrefix}.user.idToken`);
    if (storedIdToken) {
      const extractedUsername = extractUsernameFromToken(storedIdToken);
      setIsAuthenticated(true);
      setUsername(extractedUsername);

      return;
    }

    if (code) {
      // Clear url to limit possibility of double navigation
      window.history.replaceState({}, document.title, window.location.pathname);   

      // Prevent re-processing the same authorization code multiple times
      const previousAuthTokenCode = authNavigationFlowSessionState.getPreviousAuthTokenCode();
      if (previousAuthTokenCode === code) {

        // Preserve returUrl and button id across cleanup so we can retry login seamlessly
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
        localStorage.setItem(`${keyPrefix}.user.idToken`, tokens.id_token);
        localStorage.setItem(`${keyPrefix}.LastAuthUser`, tokens.id_token ? 'user' : '');
        localStorage.setItem(`${keyPrefix}.user.accessToken`, tokens.access_token);
        localStorage.setItem(`${keyPrefix}.user.refreshToken`, tokens.refresh_token);
        
        // Extract username from ID token
        const extractedUsername = extractUsernameFromToken(tokens.id_token);

        // Update auth state
        setIsAuthenticated(true);
        setUsername(extractedUsername);
        
      })
      .catch((error) => {

            console.log('Fetch Congnito token error message:', error.message);
            console.log('Fetch Congnito token error stack:', error.stack);
      });
    }
  };

  const mockLogin = (username: string) => {
    // Store mock tokens
    const mockIdToken = btoa(JSON.stringify({
      'cognito:username': username,
      email: `${username}@example.com`,
      preferred_username: username,
      sub: `mock-${Date.now()}`,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }));

    // Store in localStorage similar to Cognito
    const keyPrefix = `CognitoIdentityServiceProvider.mock`;
    localStorage.setItem(`${keyPrefix}.user.idToken`, mockIdToken);
    localStorage.setItem(`${keyPrefix}.LastAuthUser`, username);
    localStorage.setItem(`${keyPrefix}.${username}.idToken`, mockIdToken);
    localStorage.setItem(`${keyPrefix}.${username}.idToken.exp`, (Math.floor(Date.now() / 1000) + 3600).toString());

    // Update state
    setIsAuthenticated(true);
    setUsername(username);
    
    // Store in our custom location for consistency
    localStorage.setItem('mockAuth', JSON.stringify({
      idToken: mockIdToken,
      username
    }));
  };

  const login = (loginReturnUrl: string, buttonId?: string) => {
    
    // Store provided return URL and optional triggering button id
    authNavigationFlowSessionState.setLoginReturnUrl(loginReturnUrl, buttonId);

    // Mark flow initiated (used by CallbackPage and post-login UX)
    authNavigationFlowSessionState.markLoginInitiated();

    if (!cognitoConfig || !cognitoConfig.ClientId) {
      const username = window.prompt('Enter your username for local development:');
      if (username) {
        mockLogin(username);
      }
      return;
    }
        
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

  // Clear mock auth if it exists
  const mockAuth = localStorage.getItem('mockAuth');
  if (mockAuth) {
    localStorage.removeItem('mockAuth');
    setIsAuthenticated(false);
    setUsername(null);
    
    // Reload the page to reset the application state
    window.location.href = logoutReturnUrl || '/';
    return;
  }

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
    // Check for mock auth first
    const mockAuth = localStorage.getItem('mockAuth');
    if (mockAuth) {
      try {
        const { idToken } = JSON.parse(mockAuth);
        return idToken || null;
      } catch (e) {
        console.error('Error parsing mock auth data', e);
        return null;
      }
    }

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
      processAuthCallbackIfPresent,
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
