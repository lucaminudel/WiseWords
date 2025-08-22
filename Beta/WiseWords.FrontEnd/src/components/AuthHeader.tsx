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
              padding: '0.2rem'
            }}
            title="Logout"
          >
            <img 
              src="/logout.jpg" 
              alt="Logout" 
              style={{ 
                width: '20px', 
                height: '20px' 
              }} 
            />
          </button>
        </>
      ) : null}
    </div>
  );
}