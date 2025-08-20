import { useAuth } from '../contexts/AuthContext';

export default function AuthHeader() {
  const { isAuthenticated, username, IsCognitoAuthEnabled, logout } = useAuth();

  if (!IsCognitoAuthEnabled) {
    return null; // No auth UI in local mode
  }

  return (
    <div style={{ 
      position: 'absolute', 
      top: '1rem', 
      right: '1rem', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      fontSize: '0.9rem'
    }}>
      {isAuthenticated && username ? (
        <>
          <span>{username}</span>
          <button 
            onClick={logout}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '1.2rem',
              padding: '0.2rem'
            }}
            title="Logout"
          >
            🚪
          </button>
        </>
      ) : null}
    </div>
  );
}