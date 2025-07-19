import React, { useEffect, useState } from 'react';
import '../styles/LandingPage.css';

// Map API ConvoType string to display
const CONVO_TYPE_DISPLAY: Record<string, string> = {
  QUESTION: 'Question',
  PROBLEM: 'Problem',
  DILEMMA: 'Dilemma',
};

interface ApiConversation {
  Author: string;
  Title: string;
  UpdatedAtYear: string;
  PK: string; // format: 'CONVO#guid'
  ConvoType: string; // e.g. 'PROBLEM'
  UpdatedAt: string; // epoch seconds as string
}

const formatDate = (epoch: string) => {
  if (!epoch) return '';
  const date = new Date(Number(epoch) * 1000);
  return date.toLocaleDateString();
};

const ConversationsList: React.FC = () => {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const year = 2025; // Use fixed year per user context
        const resp = await fetch(`http://localhost:3000/conversations?updatedAtYear=${year}`);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        let data: ApiConversation[] = [];
        try {
          data = await resp.json();
        } catch (e) {
          throw new Error('API did not return valid JSON');
        }
        if (!Array.isArray(data)) throw new Error('Unexpected API response');
        setConversations(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="landing-page">
      <header style={{ position: 'absolute', top: 24, left: 32, zIndex: 10, width: 'fit-content' }}>
        <div className="app-title" style={{ fontSize: '1.8rem', lineHeight: 1, gap: '0.2rem' }}>
          <span className="title-word">
            <span className="big-w" style={{ fontSize: '3.2rem', lineHeight: 0.7 }}>W</span>
            <span className="small-letters" style={{ fontSize: '1.35rem', marginLeft: '0.1em' }}>ISE</span>
          </span>
          <span style={{ width: '0.4rem', display: 'inline-block' }}></span>
          <span className="title-word">
            <span className="big-w" style={{ fontSize: '3.2rem', lineHeight: 0.7, color: 'var(--color-accent)' }}>W</span>
            <span className="small-letters" style={{ fontSize: '1.35rem', marginLeft: '0.1em', color: 'var(--color-text-primary)' }}>ORDS</span>
          </span>
        </div>
      </header>
      <div className="landing-content">
        <h2 style={{ marginBottom: 32, textAlign: 'center' }}>
          Conversations ({new Date().getFullYear()})
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-color)' }}>Loading...</div>
        ) : error ? (
          <div style={{ color: 'var(--error-color)', textAlign: 'center' }}>{error}</div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-color)' }}>No conversations found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--primary-color)', color: 'var(--text-color)' }}>
                <th style={{ padding: '12px 8px', borderRadius: 8, textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 8px', borderRadius: 8, textAlign: 'left' }}>Title</th>
                <th style={{ padding: '12px 8px', borderRadius: 8, textAlign: 'left' }}>Author</th>
                <th style={{ padding: '12px 8px', borderRadius: 8, textAlign: 'left' }}>Creation Date</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => {
                let typeColor = 'var(--color-text-primary)';
                if (conv.ConvoType === 'QUESTION') typeColor = 'var(--color-question)';
                else if (conv.ConvoType === 'PROBLEM') typeColor = 'var(--color-problem)';
                else if (conv.ConvoType === 'DILEMMA') typeColor = 'var(--color-dilemma)';
                return (
                  <tr key={conv.PK} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '4px 8px', color: typeColor, fontWeight: 700 }}>{CONVO_TYPE_DISPLAY[conv.ConvoType] || conv.ConvoType}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>{conv.Title}</td>
                    <td style={{ padding: '4px 8px' }}>{conv.Author}</td>
                    <td style={{ padding: '4px 8px' }}>{formatDate(conv.UpdatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ConversationsList;
