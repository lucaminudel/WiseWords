import LandingPage from './components/LandingPage';
import ConversationsList from './components/ConversationsList';
import ConversationThread from './components/ConversationThread';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/conversations" element={<ConversationsList />} />
      <Route path="/conversations/:conversationId" element={<ConversationThread />} />
    </Routes>
  );
}

export default App;