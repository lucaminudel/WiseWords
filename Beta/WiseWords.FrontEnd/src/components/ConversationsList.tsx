import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';
import { Logo } from './common/Logo';
import { getConversationTypeColor, getConversationTypeLabel, convertConvoTypeToNumber } from '../utils/conversationUtils';
import { formatUnixTimestamp } from '../utils/dateUtils';
import { ConversationResponse } from '../types/conversation';
import { ConversationService } from '../services/conversationService';

// TypeScript interface for PageShowEvent
interface PageShowEvent extends Event {
  persisted: boolean;
}

// Duplicated logic moved to utils/conversationUtils.ts and types/conversation.ts

// formatDate logic moved to utils/dateUtils.ts

const ConversationsList: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'QUESTION',
    title: '',
    author: '',
    messageBody: ''
  });
  const formRef = useRef<HTMLDivElement>(null);

  // Binary Semaphors to prevent double calls to fetchData (API - cache). 
  // In the future review the suggestion to use data fetching library like React Query or SWR instead.
  const isInitialLoadStarted = useRef(false);
  const isInitialLoadCompleted = useRef(false);

  useEffect(() => {
    const fetchConversations = async (forceRefresh: boolean = false) => {
      setLoading(true);
      setError(null);
      try {
        const year = new Date().getFullYear();
        const data = await ConversationService.fetchConversationsViaCachedAPI(year, forceRefresh);
        // Reverse the array to show newest conversations first
        setConversations(data.reverse());
      } catch (err: any) {
        setError(err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    const handlePageShow = (event: PageShowEvent) => {
      // Only handle pageshow after initial load is complete
      if (!isInitialLoadCompleted.current) return;
      
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const navType = navEntries.length > 0 ? navEntries[0].type : 'unknown';

      let forceRefresh;
      if (event.persisted) {
        // Page restored from bfcache (back/forward button)
        forceRefresh = false;
      } else {
        // Page loaded from server
        switch (navType) {
          case 'back_forward':
            // Back/forward but not from cache
            forceRefresh = false;
            break;
          case 'reload':
            // User refreshed - force fresh data
            forceRefresh = true;
            break;
          case 'navigate':
          default:
            // Standard navigation - use cache if available
            forceRefresh =  false
            break;
        }
      }      

      fetchConversations(forceRefresh);
    };

    // Set up pageshow listener
    window.addEventListener('pageshow', handlePageShow);
    
    // Initial load - only if we haven't loaded yet
    if (!isInitialLoadStarted.current) {
      isInitialLoadStarted.current = true; // Avoid multiple initial loads due to re-renders by Double Mounting or Fast Refresh (or Hot Module Replacement
      fetchConversations(false).finally(() => {
        isInitialLoadCompleted.current = true; // Enable pageshow to handle future loads
      });
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const handleNewConversation = () => {
    setShowNewConversationForm(true);
    // Use anchor navigation for reliable scrolling
    setTimeout(() => {
      // Navigate to the form anchor
      window.location.hash = '#new-conversation-form';
      // Focus on the first input field (Type dropdown)
      if (formRef.current) {
        const firstInput = formRef.current.querySelector('select, input, textarea') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  };

  const handleCancel = () => {
    setShowNewConversationForm(false);
    setFormError(null);
    setFormData({
      type: 'QUESTION',
      title: '',
      author: '',
      messageBody: ''
    });
    // Clear hash and scroll to top to show logo/header
    window.location.hash = '';
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  const handleCreate = async () => {
    // Validate all fields
    if (!formData.type.trim() || !formData.title.trim() || !formData.author.trim() || !formData.messageBody.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      // Convert string type to number using the utility function
      const convoTypeNumber = convertConvoTypeToNumber(formData.type);
      
      const newConversation = await ConversationService.createConversationAndUpdateCache({
        NewGuid: crypto.randomUUID(),
        ConvoType: convoTypeNumber,
        Title: formData.title.trim(),
        MessageBody: formData.messageBody.trim(),
        Author: formData.author.trim(),
        UtcCreationTime: new Date().toISOString()
      });

      // Update the local state with the new conversation (cache is already updated by the service)
      setConversations(prevConversations => [newConversation, ...prevConversations]);

      // Reset form and hide it
      handleCancel();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create conversation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <header style={{ padding: '24px 32px', marginBottom: '2rem' }}>
        <Logo />
      </header>
      <div className="landing-content" style={{ maxWidth: '90%', width: '90%', alignSelf: 'center' }}>
        <h2 style={{ marginBottom: 32, textAlign: 'center' }}>
          Conversations 
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
                    <td style={{ padding: '4px 8px', color: typeColor, fontWeight: 700 }}>{getConversationTypeLabel(typeof conv.ConvoType === 'string' ? conv.ConvoType : undefined)}</td>
                    <td style={{ padding: '4px 8px' }} title={conv.Title.length > 85 ? conv.Title : undefined}>
                      <Link
                        to={`/conversations/${encodeURIComponent(conv.PK.replace('CONVO#', ''))}`}
                        state={{ title: conv.Title, type: conv.ConvoType }}
                        className="conversation-title-link"
                        style={{
                          color: 'var(--primary-color)',
                          fontWeight: 600,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          cursor: 'pointer'
                        }}
                      >
                      {conv.Title.length > 85 ? conv.Title.substring(0, 84) + '…' : conv.Title}
                      </Link>
                    </td>
                    <td style={{ padding: '4px 8px' }} title={conv.Author.length > 13 ? conv.Author : undefined}>
                      {conv.Author.length > 13 ? conv.Author.substring(0, 12) + '…' : conv.Author}
                    </td>
                    <td style={{ padding: '4px 8px' }}>{formatUnixTimestamp(conv.UpdatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {/* New Conversation Button - aligned right */}
        {!showNewConversationForm && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', width: '100%' }}>
            <button 
              onClick={handleNewConversation}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontFamily: 'Orbitron, Inter, sans-serif',
                fontSize: '1rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              New Conversation
            </button>
          </div>
        )}

      </div>
      
      {/* New Conversation Form - below the conversations list */}
      {showNewConversationForm && (
        <div 
          id="new-conversation-form"
          ref={formRef}
          style={{ 
            marginTop: '2rem', 
            padding: '2rem', 
            backgroundColor: 'var(--color-elevation)', 
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            maxWidth: '90%',
            width: '90%',
            alignSelf: 'center'
          }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Create New Conversation</h3>
          
          {/* Form Error Display */}
          {formError && (
            <div style={{ 
              color: 'var(--color-danger)', 
              backgroundColor: 'rgba(255, 79, 90, 0.1)',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              border: '1px solid var(--color-danger)'
            }}>
              {formError}
            </div>
          )}
          
          {/* Form Fields - ordered: Type, Title, Message, Author */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Type Field */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: getConversationTypeColor(formData.type),
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem'
                }}
              >
                <option value="QUESTION">Question - a question looking for an answer - allows for comments, sub-questions, and proposed answers</option>
                <option value="PROBLEM">Problem - a problem looking for a solution - allows for comments, sub-problems, and proposed solutions</option>
                <option value="DILEMMA">Dilemma - a difficult choice between multiple options - allows for comments, sub-dilemmas, and proposed resolutions</option>
              </select>
            </div>
            
            
            {/* Message Body Field */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Opening message</label>
              <textarea 
                value={formData.messageBody}
                onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
                placeholder={"Provide a short summary of the crux of the matter.\nDescribe the context, circumstances, and constraints.\nDescribe what is your end goal, and the outcome you are looking for, from this conversation."}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '100px'
                }}
              />
            </div>

            {/* Title Field */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Title</label>
              <input 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Provide a short title that summarises what the conversation is about"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Author Field - LAST */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Author</label>
              <input 
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Enter your name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            {/* Form Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={handleCancel}
                disabled={submitting}
                style={{
                  backgroundColor: 'var(--color-text-secondary)',
                  color: 'var(--color-background)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem',
                  opacity: submitting ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={submitting}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Orbitron, Inter, sans-serif',
                  fontSize: '1rem',
                  opacity: submitting ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsList;
