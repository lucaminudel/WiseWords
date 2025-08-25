export default function CallbackPage() {
  
  // Check if this is a logout callback (no code parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) {
    // This is a logout callback
    const logoutReturnUrl = sessionStorage.getItem('logoutReturnUrl');
    
    if (logoutReturnUrl) {
      sessionStorage.removeItem('logoutReturnUrl');
      window.location.replace(logoutReturnUrl);
    } else {
    }

    return null;
  }
  
  // This is a login callback
  const loginReturnUrl = sessionStorage.getItem('loginReturnUrl');

  if (!loginReturnUrl) {
    return null;
  }
  
  // Get current URL parameters (code, state, error, etc.)
  const urlParamsString = window.location.search;
  
  // Clear the stored return URL
  sessionStorage.removeItem('loginReturnUrl');

  // Redirect to return URL with all parameters
  const redirectUrl = loginReturnUrl + urlParamsString;
  
  window.location.replace(redirectUrl);

  return null;
}