import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Logo } from './common/Logo';
import { ConversatonThreadAppendPostForm } from './ConversatonThreadAppendPostForm';
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

// --- Refactored State Types ---
type FormType = 'comment' | 'drilldown' | 'conclusion';
interface FormContext {
  conversationPK: string;
  parentPostSK: string;
  insertAfterSK?: string;
}

const ConversationThread: React.FC = () => {
  const { conversationId: rawConversationId } = useParams<{ conversationId: string }>();

  const conversationId = rawConversationId?.toUpperCase().startsWith("CONVO#")
    ? "CONVO#" + rawConversationId?.substring(6).toLowerCase()
    : "CONVO#" + rawConversationId?.toLowerCase();

  const location = useLocation();
  const { title, type } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // --- Refactored State ---
  const [activeForm, setActiveForm] = useState<{ type: FormType; context: FormContext } | null>(null);
  const [formData, setFormData] = useState({ author: '', messageBody: '' });
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
          console.log('Conversation metadata not found in response for conversationId:', conversationId);
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

  // Scroll to form when it becomes visible and set focus
  useEffect(() => {
    if (activeForm) {
      setTimeout(() => {
        const formId = `${activeForm.type}-form-${activeForm.context.insertAfterSK || 'main'}`;
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
            if (formData.messageBody) {
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }
        }
      }, 200);
    }
  }, [activeForm]);

  const handleOpenForm = (type: FormType, context: FormContext, initialMessage: string = '') => {
    setActiveForm({ type, context });
    setFormData({ author: '', messageBody: initialMessage });
    setFormError(null);
  };

  const handleCancelForm = () => {
    setActiveForm(null);
    setFormData({ author: '', messageBody: '' });
    setFormError(null);
  };

  const handlePostForm = async () => {
    if (!activeForm || !conversationId) return;

    setIsSubmitting(true);
    setFormError(null);

    const { type, context } = activeForm;
    const { conversationPK, parentPostSK } = context;
    const { author, messageBody } = formData;

    try {
      let newPost: Post;
      switch (type) {
        case 'comment':
          newPost = await ConversationService.appendCommentAndUpdateCache(conversationPK, parentPostSK, author.trim(), messageBody.trim());
          break;
        case 'drilldown':
          newPost = await ConversationService.appendDrillDownAndUpdateCache(conversationPK, parentPostSK, author.trim(), messageBody.trim());
          break;
        case 'conclusion':
          newPost = await ConversationService.appendConclusionAndUpdateCache(conversationPK, parentPostSK, author.trim(), messageBody.trim());
          break;
      }

      setPosts(prevPosts => [...prevPosts, newPost]);
      handleCancelForm();

    } catch (err: any) {
      setFormError(`Failed to post ${type}. Please try again. (Error: ${err.message})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyWithQuoteClick = (post: Post) => {
    const skParts = post.SK.split('#');
    const parentSK = skParts.slice(0, -2).join('#');
    const quotedMessage = `> Original post by ${post.Author}:\n> ${post.MessageBody.replace(/\n/g, '\n> ')}\n\n`;
    
    handleOpenForm('comment', {
      conversationPK: post.PK,
      parentPostSK: parentSK,
      insertAfterSK: post.SK
    }, quotedMessage);
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
              style={{ ...buttonStyle, ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
              disabled={!!activeForm}
              onClick={() => handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })}
            >
              Comment
            </button>
            <button 
              data-testid="drill-down-button" 
              type="button" 
              style={{ ...buttonStyle, marginLeft: '8px', ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
              disabled={!!activeForm}
              onClick={() => handleOpenForm('drilldown', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })}
            >
              {getAddSubActionButtonText(conversation.ConvoType)}
            </button>
            <button 
              data-testid="propose-answer-button" 
              type="button" 
              style={{ ...buttonStyle, marginLeft: '8px', ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
              disabled={!!activeForm}
              onClick={() => handleOpenForm('conclusion', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })}
            >
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
      
      {/* --- Render Forms for Main Conversation --- */}
      {activeForm && activeForm.context.insertAfterSK === conversation?.SK && (
        <ConversatonThreadAppendPostForm
          title={`Add ${activeForm.type === 'comment' ? 'Comment' : activeForm.type === 'drilldown' ? getAddSubActionButtonText(conversation.ConvoType) : getProposeSolutionButtonText(conversation.ConvoType)}`}
          formData={formData}
          setFormData={setFormData}
          onCancel={handleCancelForm}
          onPost={handlePostForm}
          isSubmitting={isSubmitting}
          formError={formError}
          marginLeft={`${(postTypeService.getPostDepth(conversation.SK) + 1) * 48}px`}
          id={`${activeForm.type}-form-${conversation?.SK || 'main'}`}
          dataTestId={`${activeForm.type}-form-${conversation.SK}`}
        />
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
                          onClick={() => handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })}
                        >
                          Comment
                        </button>
                        <button 
                          data-testid="drill-down-button" 
                          style={{ ...buttonStyle, marginLeft: '8px' }}
                          onClick={() => handleOpenForm('drilldown', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button data-testid="propose-answer-button" style={{ ...buttonStyle, marginLeft: '8px', ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
                          disabled={!!activeForm}
                          onClick={() => handleOpenForm('conclusion', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    {/* Comment post */}
                    {isComment && post.SK !== 'METADATA' && (
                      <button 
                        type="button" 
                        data-testid="reply-quote-button" 
                        style={{ ...buttonStyle, ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
                        disabled={!!activeForm}
                        onClick={() => handleReplyWithQuoteClick(post)}
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
                          style={{ ...buttonStyle, ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
                          disabled={!!activeForm}
                          onClick={() => handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })}
                        >
                          Comment
                        </button>
                        <button 
                          type="button" 
                          data-testid="drill-down-button" 
                          style={{ ...buttonStyle, marginLeft: '8px', ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
                          disabled={!!activeForm}
                          onClick={() => handleOpenForm('drilldown', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button 
                          type="button" 
                          data-testid="propose-answer-button" 
                          style={{ ...buttonStyle, marginLeft: '8px', ...(!!activeForm && { opacity: 0.5, cursor: 'not-allowed' }) }}
                          disabled={!!activeForm}
                          onClick={() => handleOpenForm('conclusion', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })}
                        >
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    
                  </div>
                </div>
              </div>

              {/* --- Render Forms for this specific post --- */}
              {activeForm && activeForm.context.insertAfterSK === post.SK && (
                <ConversatonThreadAppendPostForm
                  title={`Add ${activeForm.type === 'comment' ? 'Comment' : activeForm.type === 'drilldown' ? getAddSubActionButtonText(conversation.ConvoType) : getProposeSolutionButtonText(conversation.ConvoType)}`}
                  formData={formData}
                  setFormData={setFormData}
                  onCancel={handleCancelForm}
                  onPost={handlePostForm}
                  isSubmitting={isSubmitting}
                  formError={formError}
                  marginLeft={`${activeForm.type === 'comment' ? newCommentDepth * 48 : (depth + 1) * 48}px`}
                  id={`${activeForm.type}-form-${post.SK}`}
                  dataTestId={`${activeForm.type}-form-${post.SK}`}
                />
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
