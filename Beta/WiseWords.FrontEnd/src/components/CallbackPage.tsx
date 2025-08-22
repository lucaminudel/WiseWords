export default function CallbackPage() {
  console.log('[CallbackPage] Processing Cognito callback');
  
  // Get the return URL from session storage
  const returnUrl = sessionStorage.getItem('returnUrl');
  console.log('[CallbackPage] Return URL:', returnUrl);
  
  // Get current URL parameters (code, state, error, etc.)
  const urlParams = window.location.search;
  console.log('[CallbackPage] URL parameters:', urlParams);
  
  // Clear the stored return URL
  sessionStorage.removeItem('returnUrl');
  
  // Redirect to return URL with all parameters
  const redirectUrl = returnUrl + urlParams;
  console.log('[CallbackPage] Redirecting to:', redirectUrl);
  
  window.location.replace(redirectUrl);

  return null;
}