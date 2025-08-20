import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loadConfig } from '../config/environment';
import { createAuthService, AuthService } from './AuthService';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
  IsCognitoAuthEnabled: boolean;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  requireAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    isLoading: true,
    IsCognitoAuthEnabled: false
  });
  
  const [authService, setAuthService] = useState<AuthService | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const config = await loadConfig();
        const service = createAuthService(config.Cognito);
        setAuthService(service);
        
        const isCognitoEnabled = !!(config.Cognito?.ClientId);
        
        if (!isCognitoEnabled) {
          setAuthState({ 
            isAuthenticated: false, 
            username: null, 
            isLoading: false, 
            IsCognitoAuthEnabled: false 
          });
          return;
        }
        
        // Check existing session
        const isAuth = await service.isAuthenticated();
        const user = await service.getCurrentUser();
        
        setAuthState({ 
          isAuthenticated: isAuth, 
          username: user, 
          isLoading: false, 
          IsCognitoAuthEnabled: true 
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async () => {
    if (!authService) return;
    await authService.login();
  };

  const logout = async () => {
    if (!authService) return;
    await authService.logout();
    setAuthState(prev => ({ ...prev, isAuthenticated: false, username: null }));
  };

  const handleCallback = async () => {
    if (!authService) return;
    await authService.handleCallback();
    
    // Update auth state after callback
    const isAuth = await authService.isAuthenticated();
    const user = await authService.getCurrentUser();
    setAuthState(prev => ({ ...prev, isAuthenticated: isAuth, username: user }));
  };

  const getAccessToken = async () => {
    if (!authService) return null;
    return await authService.getAccessToken();
  };

  const requireAuth = async (): Promise<boolean> => {
    if (!authState.IsCognitoAuthEnabled) return true; // Local mode
    
    if (authState.isAuthenticated) return true;
    
    await login();
    return false; // Will redirect, so return false
  };

  return (
    <AuthContext.Provider value={{ 
      ...authState, 
      login, 
      logout, 
      handleCallback, 
      getAccessToken, 
      requireAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}