import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ConversationsList from './components/ConversationsList';
import ConversationThread from './components/ConversationThread';
import CallbackPage from './components/CallbackPage';
import AuthHeader from './components/AuthHeader';
import { useAuth } from './contexts/AuthContext';
import { setAuthTokenProvider } from './api/conversationApi';

function App() {
  const { getIdToken } = useAuth();

  useEffect(() => {
    // Set up auth token provider for API calls
    setAuthTokenProvider(getIdToken);
  }, [getIdToken]);

  return (
    <div>
      <AuthHeader />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/conversations" element={<ConversationsList />} />
        <Route path="/conversations/:conversationId" element={<ConversationThread />} />
        <Route path="/callback" element={<CallbackPage />} />
      </Routes>
    </div>
  );
}

export default App;