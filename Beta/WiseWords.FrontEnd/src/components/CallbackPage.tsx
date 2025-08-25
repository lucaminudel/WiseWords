import { authNavigationFlowSessionState } from '../services/authNavigationFlowSessionState';

export default function CallbackPage() {
  
  // Check if this is a logout callback (no code parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) {
    // This is a logout callback
    const logoutReturnUrl = authNavigationFlowSessionState.consumeLogoutReturnUrl();
    
    if (logoutReturnUrl) {
      
      window.location.replace(logoutReturnUrl);
    } else {
    }

    return null;
  }
  
  // This is a login callback
  const loginReturnUrl = authNavigationFlowSessionState.consumeLoginReturnUrl();

  if (!loginReturnUrl) {
    return null;
  }
  
  // Get current URL parameters (code, state, error, etc.)
  const urlParamsString = window.location.search;
  
  // loginReturnUrl already consumed (read-and-removed) by service

  // Redirect to return URL with all parameters
  const redirectUrl = loginReturnUrl + urlParamsString;
  
  window.location.replace(redirectUrl);

  return null;
}