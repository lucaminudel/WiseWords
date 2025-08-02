import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Logo } from './common/Logo';
import { sortPosts } from '../utils/postSorter';
import { ConversationService } from '../services/conversationService';
import { formatUnixTimestamp } from '../utils/dateUtils';
import { getConversationTypeColor } from '../utils/conversationUtils';
import { postTypeService } from '../utils/postType';
import { getAddSubActionButtonText, getProposeSolutionButtonText } from '../utils/buttonTextUtils';
import { Post } from '../types/conversation';


// Post interface moved to types/conversation.ts
interface PageShowEvent extends Event {
  persisted: boolean;
}

const ConversationThread: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const { title, type } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showDrillDownForm, setShowDrillDownForm] = useState(false);
  const [commentFormContext, setCommentFormContext] = useState<{
    conversationPK: string;
    parentPostSK: string;
    insertAfterSK?: string;
  } | null>(null);
  const [drillDownFormContext, setDrillDownFormContext] = useState<{
    conversationPK: string;
    parentPostSK: string;
    insertAfterSK?: string;
  } | null>(null);
  const [commentFormData, setCommentFormData] = useState({
    author: '',
    messageBody: ''
  });
  const [drillDownFormData, setDrillDownFormData] = useState({
    author: '',
    messageBody: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

// Binary Semaphors to prevent double calls to fetchData (API - cache). 
// In the future review the suggestion to use data fetching library like React Query or SWR instead.
const isInitialLoadStarted = useRef(false);
const isInitialLoadCompleted = useRef(false);
  
  useEffect(() => {
    const fetchConversation = async (forceRefresh: boolean = false) => {
      if (!conversationId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await ConversationService.fetchConversationPostsViaCachedAPI(conversationId, forceRefresh);
        const conversationData = data.find((item: Post) => item.SK === 'METADATA');
        const postsData = data.filter((item: Post) => item.SK !== 'METADATA');        
        if (!conversationData) {
          throw new Error('Conversation metadata not found in response');
        }
        setConversation(conversationData);
        setPosts(postsData);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading the conversation');
      } finally {
        setLoading(false);
      }
    };

    const handlePageShow = (event: PageShowEvent) => {
      // Only handle pageshow after initial load is complete
      if (!isInitialLoadCompleted.current) return;
      
      if (!conversationId) return;
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
            forceRefresh = false;
            break;
          case 'reload':
            // User refreshed - force fresh data
            forceRefresh = true;
            break;
          case 'navigate':
          default:
            // Standard navigation - use cache if available
            forceRefresh = false;
            break;
        }
      }
      
      fetchConversation(forceRefresh); 
    };

    // Set up pageshow listener
    window.addEventListener('pageshow', handlePageShow);
    
    // Initial load - only if we haven't loaded yet and conversationId exists
    if (conversationId && !isInitialLoadStarted.current) {
      isInitialLoadStarted.current = true; // Avoid multiple initial loads due to re-renders by Double Mounting or Fast Refresh (or Hot Module Replacement
      fetchConversation(false).finally(() => {
        isInitialLoadCompleted.current = true; // Enable pageshow to handle future loads
      });
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [conversationId]);

  // Scroll to comment form when it becomes visible and set focus
  useEffect(() => {
    if (showCommentForm && commentFormContext) {
      setTimeout(() => {
        const formId = `comment-form-${commentFormContext.insertAfterSK || 'main'}`;
        const formElement = document.getElementById(formId);
        
        if (formElement) {
          // Scroll so bottom of form aligns with bottom of viewport
          formElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end'
          });
          
          // Focus on the message textarea and position cursor
          const textarea = formElement.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            
            // If there's pre-filled content (quoted text), position cursor at the end
            if (commentFormData.messageBody) {
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }
        }
      }, 200);
    }
  }, [showCommentForm, commentFormContext]);

  // Scroll to drill-down form when it becomes visible and set focus
  useEffect(() => {
    if (showDrillDownForm && drillDownFormContext) {
      setTimeout(() => {
        const formId = `drill-down-form-${drillDownFormContext.insertAfterSK || 'main'}`;
        const formElement = document.getElementById(formId);
        
        if (formElement) {
          // Scroll so bottom of form aligns with bottom of viewport
          formElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end'
          });
          
          // Focus on the message textarea and position cursor
          const textarea = formElement.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            
            // If there's pre-filled content, position cursor at the end
            if (drillDownFormData.messageBody) {
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }
        }
      }, 200);
    }
  }, [showDrillDownForm, drillDownFormContext]);

  const handleCommentClick = (conversationPK: string, parentPostSK: string, insertAfterSK?: string) => {
    console.log('Opening comment form for:', conversationPK, parentPostSK, insertAfterSK);
    setCommentFormContext({
      conversationPK,
      parentPostSK,
      insertAfterSK
    });
    console.log('Opening comment form for: setCommentFormContext done - ');

    setShowCommentForm(true);
    console.log('Opening comment form for: setShowCommentForm done ', showCommentForm , commentFormContext?.insertAfterSK , conversation?.SK, showCommentForm && commentFormContext?.insertAfterSK === conversation?.SK);

  };

  const handleDrillDownClick = (conversationPK: string, parentPostSK: string, insertAfterSK?: string) => {
    setDrillDownFormContext({
      conversationPK,
      parentPostSK,
      insertAfterSK
    });
    setShowDrillDownForm(true);
  };

  const handleReplyWithQuoteClick = (conversationPK: string, postSK: string, insertAfterSK: string, originalPost: Post) => {
    // For a reply, the parent is the parent of the post being replied to.
    const skParts = postSK.split('#');
    const parentSKParts = skParts.slice(0, -2);
    const correctParentSK = parentSKParts.join('#');

    // Format the quoted message
    const quotedMessage = `> Original post by ${originalPost.Author}:\n> ${originalPost.MessageBody.replace(/\n/g, '\n> ')}\n\n`;
    
    setCommentFormContext({
      conversationPK,
      parentPostSK: correctParentSK,
      insertAfterSK
    });
    setCommentFormData({
      author: '',
      messageBody: quotedMessage
    });
    setShowCommentForm(true);
  };

  const handleCommentCancel = () => {
    setShowCommentForm(false);
    setCommentFormContext(null);
    setCommentFormData({
      author: '',
      messageBody: ''
    });
    setFormError(null);
  };

  const handleDrillDownCancel = () => {
    setShowDrillDownForm(false);
    setDrillDownFormContext(null);
    setDrillDownFormData({
      author: '',
      messageBody: ''
    });
    setFormError(null);
  };

  const handleCommentPost = async () => {
    if (!commentFormContext || !conversationId) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newPost = await ConversationService.appendCommentAndUpdateCache(
        commentFormContext.conversationPK,
        commentFormContext.parentPostSK,
        commentFormData.author.trim(),
        commentFormData.messageBody.trim()
      );

      // Update local UI state immediately
      const updatedPosts = [...posts, newPost];
      setPosts(updatedPosts);

      // Reset and hide the form
      handleCommentCancel();

    } catch (err: any) {
      setFormError(`Failed to post comment. Please try again. (Error: ${err.message})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrillDownPost = async () => {
    if (!drillDownFormContext || !conversationId) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newPost = await ConversationService.appendDrillDownAndUpdateCache(
        drillDownFormContext.conversationPK,
        drillDownFormContext.parentPostSK,
        drillDownFormData.author.trim(),
        drillDownFormData.messageBody.trim()
      );

      // Update local UI state immediately
      const updatedPosts = [...posts, newPost];
      setPosts(updatedPosts);

      // Reset and hide the form
      handleDrillDownCancel();

    } catch (err: any) {
      setFormError(`Failed to post drill down. Please try again. (Error: ${err.message})`);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <header style={{ padding: '24px 32px', marginBottom: '2rem' }}>
          <Logo />
        </header>
        <div style={{ 
          width: '90%',
          margin: '0 auto',
          padding: '24px',
          color: 'var(--color-text-primary)',
          fontFamily: 'Inter, sans-serif'
        }}>
          {title && type ? (
            <div style={{ 
              backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ 
                color: getConversationTypeColor(type),
                fontWeight: 600,
                marginBottom: '8px',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {type.toLowerCase()}
              </div>
              <h1 style={{ 
                margin: '0 0 16px 0',
                fontSize: '1.8rem',
                fontWeight: 600
              }}>
                {title}
              </h1>
              
              <div style={{ 
                marginBottom: '16px',
                whiteSpace: 'pre-line',
                lineHeight: '1.6',
                color: 'var(--color-text-primary)'
              }}>
                Loading Conversation...
              </div>
              
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-text-secondary, #bbbbbb)',
                fontSize: '0.9rem',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border, #444)'
              }}>
                <span style={{ 
                  color: 'var(--color-text-secondary, #bbbbbb)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: 'normal',
                  fontStyle: 'normal'
                }}>Loading...</span>
                <div style={{ marginLeft: 'auto' }}>
                  <button type="button" style={{ ...buttonStyle, opacity: 0.5, cursor: 'not-allowed' }} disabled>Comment</button>
                  <button type="button" style={{ ...buttonStyle, marginLeft: '8px', opacity: 0.5, cursor: 'not-allowed' }} disabled>
                    Add Sub-Action
                  </button>
                  <button type="button" style={{ ...buttonStyle, marginLeft: '8px', opacity: 0.5, cursor: 'not-allowed' }} disabled>
                    Propose Solution
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '24px',
              color: 'var(--color-text-primary)',
              fontFamily: '"Orbitron", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '1rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-line',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Loading Conversation...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        backgroundColor: 'var(--color-background-secondary)', 
        borderRadius: '8px',
        borderLeft: '4px solid var(--color-danger)',
        margin: '1rem 0',
        color: 'var(--color-text-primary)'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Error Loading Conversation</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: 'var(--color-danger)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <header style={{ padding: '24px 32px', marginBottom: '2rem', width: '100%' }}>
          <Link to="/conversations" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', fontSize: '1.8rem', lineHeight: 1, gap: '0.2rem', fontFamily: 'Orbitron, Inter, sans-serif', fontWeight: 900, letterSpacing: '0.08em' }}>
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
          </Link>
        </header>
        <div style={{ 
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          borderLeft: '4px solid var(--color-border)',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3>Conversation Not Found</h3>
          <p>The requested conversation could not be found or may have been deleted.</p>
          <button 
            onClick={() => window.history.back()}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Back to Conversations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <header style={{ padding: '24px 32px', marginBottom: '2rem' }}>
        <Logo linkTo="/conversations" />
      </header>
      <div style={{ 
        width: '90%',
        margin: '0 auto',
        padding: '24px',
        color: 'var(--color-text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div 
          data-testid="post-container"
          style={{ 
            backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
          {conversation.ConvoType && (
            <div style={{ 
              color: getConversationTypeColor(conversation.ConvoType),
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {conversation.ConvoType.toLowerCase()}
            </div>
          )}
          <h1 style={{ 
            margin: '0 0 16px 0',
            fontSize: '1.8rem',
            fontWeight: 600
          }}>
            {conversation.Title}
          </h1>
        
        <div style={{ 
          marginBottom: '16px',
          whiteSpace: 'pre-line',
          lineHeight: '1.6'
        }}>
          {conversation.MessageBody}
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          color: 'var(--color-text-secondary, #bbbbbb)',
          fontSize: '0.9rem',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border, #444)'
        }}>
          <span>by <strong>{conversation.Author}</strong> • {formatUnixTimestamp(conversation.UpdatedAt)}</span>
          <div style={{ marginLeft: 'auto' }}>
            <button 
              data-testid="comment-button" 
              type="button" 
              style={buttonStyle}
              onClick={() => handleCommentClick(conversation.PK, '', conversation.SK)}
            >
              Comment
            </button>
            <button 
              data-testid="drill-down-button" 
              type="button" 
              style={{ ...buttonStyle, marginLeft: '8px' }}
              onClick={() => handleDrillDownClick(conversation.PK, '', conversation.SK)}
            >
              {getAddSubActionButtonText(conversation.ConvoType)}
            </button>
            <button data-testid="propose-answer-button" type="button" style={{ ...buttonStyle, marginLeft: '8px' }}>
              {getProposeSolutionButtonText(conversation.ConvoType)}
            </button>
          </div>
        </div>
      </div>
      
      <h2 style={{ 
        fontSize: '1.5rem',
        margin: '32px 0 16px 0',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--color-border, #444)'
      }}>
        Responses
      </h2>
      
      {/* Comment Form for Main Conversation */}
      {showCommentForm && commentFormContext?.insertAfterSK === conversation?.SK && (
        <div 
          id={`comment-form-${conversation?.SK || 'main'}`}
          style={{ 
          marginLeft: `${(postTypeService.getPostDepth(conversation.SK) + 1) * 48}px`,
          marginTop: '16px',
          padding: '16px',
          backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
          borderRadius: '8px',
          border: '2px solid var(--color-accent)',
          color: 'var(--color-text-primary)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ 
            color: 'var(--color-accent)',
            fontWeight: 600,
            marginBottom: '16px',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Add Comment
          </div>
          
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Message
              </label>
              <textarea 
                value={commentFormData.messageBody}
                onChange={(e) => setCommentFormData({ ...commentFormData, messageBody: e.target.value })}
                placeholder="Enter your comment..."
                rows={3}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Author
              </label>
              <input 
                type="text"
                value={commentFormData.author}
                onChange={(e) => setCommentFormData({ ...commentFormData, author: e.target.value })}
                placeholder="Enter your name"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={handleCommentCancel}
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'var(--color-text-secondary)',
                  color: 'var(--color-background)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCommentPost}
                disabled={!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: (!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  opacity: (!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting) ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {isSubmitting ? 'Posting...' : (formError ? 'Retry Post' : 'Post')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Drill Down Form for Main Conversation */}
      {showDrillDownForm && drillDownFormContext?.insertAfterSK === conversation?.SK && (
        <div 
          id={`drill-down-form-${conversation.SK}`}
          data-testid={`drill-down-form-${conversation.SK}`}
          style={{ 
          marginLeft: `${(postTypeService.getPostDepth(conversation.SK) + 1) * 48}px`,
          marginTop: '16px',
          padding: '16px',
          backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
          borderRadius: '8px',
          border: '2px solid var(--color-accent)',
          color: 'var(--color-text-primary)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ 
            color: 'var(--color-accent)',
            fontWeight: 600,
            marginBottom: '16px',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Add {getAddSubActionButtonText(conversation.ConvoType)}
          </div>
          
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Message
              </label>
              <textarea 
                value={drillDownFormData.messageBody}
                onChange={(e) => setDrillDownFormData({ ...drillDownFormData, messageBody: e.target.value })}
                placeholder="Enter your message..."
                rows={3}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                Author
              </label>
              <input 
                type="text"
                value={drillDownFormData.author}
                onChange={(e) => setDrillDownFormData({ ...drillDownFormData, author: e.target.value })}
                placeholder="Enter your name"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={handleDrillDownCancel}
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'var(--color-text-secondary)',
                  color: 'var(--color-background)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDrillDownPost}
                disabled={!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: (!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  opacity: (!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting) ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {isSubmitting ? 'Posting...' : (formError ? 'Retry Post' : 'Post')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {posts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px',
          color: 'var(--color-text-secondary)'
        }}>
          No responses yet. Be the first to respond!
        </div>
      ) : (
        <div>
          {sortPosts(posts).map((post) => {
            // Use utility functions for post type detection
            const postTypeInfo = postTypeService.getPostType(post.SK);
            const { isDrillDown, isConclusion, isComment } = postTypeInfo;
            
            const postType = postTypeService.getPostTypeDisplay(post.SK, conversation.ConvoType);
            const depth = postTypeService.getPostDepth(post.SK);
            
            // Determine the correct depth for the new comment form
            const isReplyingToComment = postTypeInfo.isComment;
            const newCommentDepth = isReplyingToComment ? depth : depth + 1;

            return (
              <React.Fragment key={post.SK}>
                <div 
                  data-testid="post-container"
                  style={{ 
                    marginLeft: `${depth * 48}px`,
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
                    borderRadius: '8px'
                  }}
                >
                {postType && (
                  <div style={{ 
                    color: postType === 'Comment'
                      ? 'var(--color-text-secondary)'
                      : getConversationTypeColor(conversation.ConvoType),
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {postType}
                  </div>
                )}
                
                <div style={{ 
                  whiteSpace: 'pre-line',
                  lineHeight: '1.6',
                  marginBottom: '12px'
                }}>
                  {post.MessageBody}
                </div>
                
                <div style={{ 
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary, #bbbbbb)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-border, #333)'
                }}>
                  <span>by <strong>{post.Author}</strong> • {formatUnixTimestamp(post.UpdatedAt)}</span>
                  <div>
                    {/* Root conversation post */}
                    {post.SK === 'METADATA' && (
                      <>
                        <button 
                          data-testid="comment-button" 
                          style={buttonStyle}
                          onClick={() => handleCommentClick(conversation.PK, '', post.SK)}
                        >
                          Comment
                        </button>
                        <button 
                          data-testid="drill-down-button" 
                          style={{ ...buttonStyle, marginLeft: '8px' }}
                          onClick={() => handleDrillDownClick(conversation.PK, '', post.SK)}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button data-testid="propose-answer-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    {/* Comment post */}
                    {isComment && post.SK !== 'METADATA' && (
                      <button 
                        type="button" 
                        data-testid="reply-quote-button" 
                        style={buttonStyle}
                        onClick={() => handleReplyWithQuoteClick(conversation.PK, post.SK, post.SK, post)}
                      >
                        Reply with quote
                      </button>
                    )}
                    
                    {/* Drill-down post */}
                    {isDrillDown && !isConclusion && (
                      <>
                        <button 
                          type="button" 
                          data-testid="comment-button" 
                          style={buttonStyle}
                          onClick={() => handleCommentClick(conversation.PK, post.SK, post.SK)}
                        >
                          Comment
                        </button>
                        <button 
                          type="button" 
                          data-testid="drill-down-button" 
                          style={{ ...buttonStyle, marginLeft: '8px' }}
                          onClick={() => handleDrillDownClick(conversation.PK, post.SK, post.SK)}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button type="button" data-testid="propose-answer-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    
                  </div>
                </div>
              </div>

              {/* Comment Form for this specific post */}
              {showCommentForm && commentFormContext?.insertAfterSK === post.SK && (
                <div 
                  id={`comment-form-${post.SK}`}
                  style={{ 
                  marginLeft: `${newCommentDepth * 48}px`,
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
                  borderRadius: '8px',
                  border: '2px solid var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  <div style={{ 
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Add Comment
                  </div>
                  
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        Message
                      </label>
                      <textarea 
                        value={commentFormData.messageBody}
                        onChange={(e) => setCommentFormData({ ...commentFormData, messageBody: e.target.value })}
                        placeholder="Enter your comment..."
                        rows={3}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        Author
                      </label>
                      <input 
                        type="text"
                        value={commentFormData.author}
                        onChange={(e) => setCommentFormData({ ...commentFormData, author: e.target.value })}
                        placeholder="Enter your name"
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button 
                        onClick={handleCommentCancel}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: 'var(--color-text-secondary)',
                          color: 'var(--color-background)',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleCommentPost}
                        disabled={!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting}
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-text-primary)',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: (!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          opacity: (!commentFormData.author.trim() || !commentFormData.messageBody.trim() || isSubmitting) ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isSubmitting ? 'Posting...' : (formError ? 'Retry Post' : 'Post')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Drill Down Form for this specific post */}
              {showDrillDownForm && drillDownFormContext?.insertAfterSK === post.SK && (
                <div 
                  id={`drill-down-form-${post.SK}`}
                  data-testid={`drill-down-form-${post.SK}`}
                  style={{ 
                  marginLeft: `${(depth + 1) * 48}px`,
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
                  borderRadius: '8px',
                  border: '2px solid var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  <div style={{ 
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Add {getAddSubActionButtonText(conversation.ConvoType)}
                  </div>
                  
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        Message
                      </label>
                      <textarea 
                        value={drillDownFormData.messageBody}
                        onChange={(e) => setDrillDownFormData({ ...drillDownFormData, messageBody: e.target.value })}
                        placeholder="Enter your message..."
                        rows={3}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        Author
                      </label>
                      <input 
                        type="text"
                        value={drillDownFormData.author}
                        onChange={(e) => setDrillDownFormData({ ...drillDownFormData, author: e.target.value })}
                        placeholder="Enter your name"
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button 
                        onClick={handleDrillDownCancel}
                        disabled={isSubmitting}
                        style={{
                          backgroundColor: 'var(--color-text-secondary)',
                          color: 'var(--color-background)',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleDrillDownPost}
                        disabled={!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting}
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-text-primary)',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: (!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '1rem',
                          opacity: (!drillDownFormData.author.trim() || !drillDownFormData.messageBody.trim() || isSubmitting) ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isSubmitting ? 'Posting...' : (formError ? 'Retry Post' : 'Post')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

const buttonStyle = {
  backgroundColor: 'var(--color-accent)',
  color: 'var(--color-text-primary)',
  border: 'none',
  padding: '0.3rem 0.7rem',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 700,
  fontFamily: 'Orbitron, Inter, sans-serif',
  fontSize: '0.85rem',
  transition: 'all 0.2s ease',
  ':hover': {
    backgroundColor: 'var(--color-accent-hover)',
    transform: 'translateY(-1px)'
  },
  ':active': {
    transform: 'translateY(0)'
  }
};


export default ConversationThread;