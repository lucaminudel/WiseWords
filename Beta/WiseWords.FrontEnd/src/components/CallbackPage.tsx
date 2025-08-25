import { authNavigationFlowSessionState } from '../services/authNavigationFlowSessionState';

export default function CallbackPage() {
    
  if (authNavigationFlowSessionState.isLogOut()) {

    window.location.replace(authNavigationFlowSessionState.consumeLogoutReturnUrl()!);

    return null;
  }
  
  if (authNavigationFlowSessionState.isLogIn()) {

    const loginReturnUrl = authNavigationFlowSessionState.consumeLoginReturnUrl();
    
    const urlParamsString = window.location.search;
  
    const redirectUrl = loginReturnUrl + urlParamsString;
    
    window.location.replace(redirectUrl);

    return null;
  }

  // Fallback to the Landing page
  window.location.replace("/");

}