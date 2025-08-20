import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function CallbackPage() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleCallback();
        // Redirect to intended destination or home
        const returnTo = sessionStorage.getItem('returnTo') || '/';
        sessionStorage.removeItem('returnTo');
        navigate(returnTo);
      } catch (error) {
        console.error('Authentication callback failed:', error);
        navigate('/');
      }
    };

    processCallback();
  }, [handleCallback, navigate]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Completing sign in...</h2>
      <p>Please wait while we complete your authentication.</p>
    </div>
  );
}