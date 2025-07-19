import './styles/App.css';
import LandingPage from './components/LandingPage';
import ConversationsList from './components/ConversationsList';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/conversations" element={<ConversationsList />} />
    </Routes>
  );
}

export default App;