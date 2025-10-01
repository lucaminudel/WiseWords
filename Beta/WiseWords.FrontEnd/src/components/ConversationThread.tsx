import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Logo } from './common/Logo';
import { ConversatonThreadAppendPostForm } from './ConversatonThreadAppendPostForm';
import { ConversationInviteForm } from './ConversationInviteForm';
import { sortPosts } from '../utils/postSorter';
import { buildNestedConversation } from '../utils/conversationExport';
import { buildConversationHtml } from '../utils/conversationExportHtml';
import { ConversationService } from '../services/conversationService';
import { formatUnixTimestamp } from '../utils/dateUtils';
import { getConversationTypeColor } from '../utils/conversationUtils';
import { postTypeService } from '../utils/postType';
import { getAddSubActionButtonText, getProposeSolutionButtonText } from '../utils/buttonTextUtils';
import { Post } from '../types/conversation';
import { useAuth } from '../contexts/AuthContext';
import { authNavigationFlowSessionState } from '../services/authNavigationFlowSessionState';


// Post interface moved to types/conversation.ts
interface PageShowEvent extends Event {
  persisted: boolean;
}

// --- Refactored State Types ---
type FormType = 'comment' | 'drilldown' | 'conclusion' | 'invite';
interface FormContext {
  conversationPK: string;
  parentPostSK: string;
  insertAfterSK?: string;
}

const ConversationThread: React.FC = () => {
  const { isAuthenticated, IsCognitoAuthEnabled, login, authError, username, email, processAuthCallbackIfPresent } = useAuth();
  const { conversationId: rawConversationId } = useParams<{ conversationId: string }>();

  const conversationId = rawConversationId?.toUpperCase().startsWith("CONVO#")
    ? "CONVO#" + rawConversationId?.substring(6).toLowerCase()
    : "CONVO#" + rawConversationId?.toLowerCase();

  const location = useLocation();
  const { title, type } = location.state || {};

  // Process Cognito callback (if any) once when auth is enabled
  const processedAuthCallback = useRef(false);
  useEffect(() => {
    if (processedAuthCallback.current) return;
    if (IsCognitoAuthEnabled && window.location.search.includes('code=')) {
      processedAuthCallback.current = true;
      void processAuthCallbackIfPresent();
    }
  }, [IsCognitoAuthEnabled]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // --- Refactored State ---
  const [activeForm, setActiveForm] = useState<{ type: FormType; context: FormContext } | null>(null);
  const [formData, setFormData] = useState<{ title?: string; messageBody: string}>({ 
    title: '',
    messageBody: '' 
  });
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteFormError, setInviteFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showOwnershipInfo, setShowOwnershipInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

// Binary Semaphors to prevent double calls to fetchData (API - cache). 
// In the future review the suggestion to use data fetching library like React Query or SWR instead.
const isInitialLoadStarted = useRef(false);
const isInitialLoadCompleted = useRef(false);
  
  useEffect(() => {
    const fetchConversation = async (forceRefresh: boolean = false) => {
      if (!conversationId) return;

      setInfoMessage(null);
      setLoading(true);
      setError(null);
      setShowOwnershipInfo(false); // Clear info message when starting new conversation load
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
          
          // Focus on the first input field (Title if required, otherwise Message)
          if (activeForm.type !== 'comment') {
            // For forms that require a title, focus on the title input first
            const titleInput = formElement.querySelector('input[type="text"]') as HTMLInputElement;
            if (titleInput) {
              titleInput.focus();
            } else {
              // Fallback to textarea if title input not found
              const textarea = formElement.querySelector('textarea') as HTMLTextAreaElement;
              textarea?.focus();
            }
          } else {
            // For comments, focus on the textarea
            const textarea = formElement.querySelector('textarea') as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
              
              // If there's pre-filled content (quoted text), position cursor at the end
              if (formData.messageBody) {
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }
          }
        }
      }, 200);
    }
  }, [activeForm]);



  const handleOpenForm = (type: FormType, context: FormContext, initialMessage: string = '') => {
    setInfoMessage(null);
    setActiveForm({ type, context });
    setFormData({ title: '', messageBody: initialMessage });
    setFormError(null);
    // Exclusive form handling: if invite opens, close post forms; vice versa
    if (type === 'invite') {
      setInviteFormOpen(true);
    } else {
      setInviteFormOpen(false);
    }
  };

  const handleCancelForm = () => {
    setInfoMessage(null);
    setActiveForm(null);
    setFormData({ title: '', messageBody: '' });
    setFormError(null);
    setInviteFormOpen(false);
    setInviteFormError(null);
    setInviteSubmitting(false);
    setShowOwnershipInfo(false); // Clear info message when cancelling forms
  };

  // Check if current user is the conversation owner
  const isConversationOwner = (): boolean => {
    if (!conversation || !username) return false;
    return conversation.Author === username;
  };

  // Handle restricted actions for non-owners (drill-down and conclusion)
  const handleRestrictedAction = (type: 'drilldown' | 'conclusion', context: FormContext, initialMessage: string = '') => {
    if (!isConversationOwner()) {
      setShowOwnershipInfo(true);
    }
    handleOpenForm(type, context, initialMessage);
  };

  // If login is required, store buttonId and start login. Returns true if login started.
  const handleLoginIfNeeded = (buttonId: string): boolean => {
    if (!isAuthenticated) {
      const loginReturnUrl = window.location.origin + window.location.pathname;
      login(loginReturnUrl, buttonId);
      return true;
    }
    return false;
  };

  // Restore post-click behavior after login/callback by re-clicking the stored button id
  useEffect(() => {
    if (!isAuthenticated) return;

    const loginInitiated = authNavigationFlowSessionState.consumeLoginInitiated();
    if (!loginInitiated) return;

    const buttonId = authNavigationFlowSessionState.consumeLoginTriggeredButtonId();
    if (!buttonId) return;

    // Poll a few times to ensure content is rendered
    let attempts = 0;
    const maxAttempts = 3;
    const interval = setInterval(() => {
      attempts++;
      const btn = document.getElementById(buttonId);
      if (btn) {
        clearInterval(interval);
        btn.click();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);
  }, [isAuthenticated]);

  // Retry login when a transient auth error is signaled (e.g., duplicated auth code)
  useEffect(() => {
    if (IsCognitoAuthEnabled && !isAuthenticated && authError) {
      const preservedButtonId = authNavigationFlowSessionState.consumeLoginTriggeredButtonId();
      const loginReturnUrl = window.location.origin + window.location.pathname;
      login(loginReturnUrl, preservedButtonId || undefined);
    }
  }, [authError, IsCognitoAuthEnabled, isAuthenticated]);

  const handleSubmit = async () => {
    if (!activeForm || !conversationId) return;

    setInfoMessage(null);

    // Validate required fields
    const requiredFields: { [key: string]: string } = {
      messageBody: formData.messageBody.trim(),
      ...(activeForm.type !== 'comment' ? { title: (formData.title || '').trim() } : {})
    };

    if (Object.values(requiredFields).some(field => !field)) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const { type, context } = activeForm;
    const { conversationPK, parentPostSK } = context;
    const { messageBody, title: formTitle } = formData;

    try {
      let newPost: Post;
      const finalAuthor = username!.trim();
      switch (type) {
        case 'comment':
          newPost = await ConversationService.appendCommentAndUpdateCache(conversationPK, parentPostSK, finalAuthor, messageBody.trim());
          break;
        case 'drilldown':
          newPost = await ConversationService.appendDrillDownAndUpdateCache(conversationPK, parentPostSK, finalAuthor, messageBody.trim(), (formTitle || '').trim());
          break;
        case 'conclusion':
          newPost = await ConversationService.appendConclusionAndUpdateCache(conversationPK, parentPostSK, finalAuthor, messageBody.trim(), (formTitle || '').trim());
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
              
              <div className="thread-meta-row" style={{ 
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
                <div className="thread-actions">
                  <button type="button" className="button-thread-action button-disabled" disabled>Comment</button>
                  <button type="button" className="button-thread-action button-margin-left button-disabled" disabled>
                    Add Sub-problem
                  </button>
                  <button type="button" className="button-thread-action button-margin-left button-disabled" disabled>
                    Suggest Solution
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
        {infoMessage && (
          <div 
            className="info-message-box"
            style={{
              marginBottom: '24px',
            }}
          >
            <span>{infoMessage}</span>
          </div>
        )}
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
        
        <div className="thread-meta-row" style={{ 
          display: 'flex',
          alignItems: 'center',
          color: 'var(--color-text-secondary, #bbbbbb)',
          fontSize: '0.9rem',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border, #444)'
        }}>
          {isConversationOwner() && (
            <>
              <button
                id={`invite-participants-button-${conversation.SK}`}
                data-testid="invite-participants-button"
                type="button"
                className={`button-thread-action button-margin-right ${!!activeForm ? 'button-disabled' : ''}`}
                disabled={!!activeForm}
                onClick={() => {
                  const buttonId = `invite-participants-button-${conversation.SK}`;
                  if (handleLoginIfNeeded(buttonId)) return;
                  handleOpenForm('invite', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK } as any);
                }}
              >
                Invite participants
              </button>
              <button
                id={`export-conversation-button-${conversation.SK}`}
                data-testid="export-conversation-button"
                type="button"
                className={`button-thread-action button-margin-right ${!!activeForm ? 'button-disabled' : ''}`}
                disabled={!!activeForm}
                onClick={() => {
                try {
                  // Build nested export structure and trigger JSON + HTML downloads (part b + c)
                  const exportData = buildNestedConversation(conversation, posts);
                  const safeId = (conversationId || conversation.PK || 'conversation').replace(/^CONVO#/i, '');

                  // Download JSON
                  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const jsonUrl = URL.createObjectURL(jsonBlob);
                  const a1 = document.createElement('a');
                  a1.href = jsonUrl;
                  const jsonFileName = `conversation-${safeId}.json`;
                  a1.download = jsonFileName;
                  document.body.appendChild(a1);
                  a1.click();
                  document.body.removeChild(a1);
                  URL.revokeObjectURL(jsonUrl);

                  // Download HTML that references the JSON (and can fallback to file input)
                  const htmlContent = buildConversationHtml(exportData, { jsonFileName, titleOverride: conversation.Title });
                  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
                  const htmlUrl = URL.createObjectURL(htmlBlob);
                  const a2 = document.createElement('a');
                  a2.href = htmlUrl;
                  a2.download = `conversation-${safeId}.html`;
                  document.body.appendChild(a2);
                  a2.click();
                  document.body.removeChild(a2);
                  URL.revokeObjectURL(htmlUrl);
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Failed to export conversation as JSON', err);
                }
              }}
            >
              Export conversation
            </button>
          </>
          )}
          <span>by <strong>{conversation.Author}</strong> • {formatUnixTimestamp(conversation.UpdatedAt)}</span>
          <div className="thread-actions">
            <button 
              id={`comment-button-${conversation.SK}`}
              data-testid="comment-button" 
              type="button" 
              className={`button-thread-action ${!!activeForm ? 'button-disabled' : ''}`}
              disabled={!!activeForm}
              onClick={() => {
                const buttonId = `comment-button-${conversation.SK}`;
                if (handleLoginIfNeeded(buttonId)) return;
                handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })
              }}
            >
              Comment
            </button>
            <button 
              id={`drill-down-button-${conversation.SK}`}
              data-testid="drill-down-button" 
              type="button" 
              className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
              disabled={!!activeForm}
              onClick={() => {
                const buttonId = `drill-down-button-${conversation.SK}`;
                if (handleLoginIfNeeded(buttonId)) return;
                handleRestrictedAction('drilldown', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })
              }}
            >
              {getAddSubActionButtonText(conversation.ConvoType)}
            </button>
            <button 
              id={`propose-answer-button-${conversation.SK}`}
              data-testid="propose-answer-button" 
              type="button" 
              className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
              disabled={!!activeForm}
              onClick={() => {
                const buttonId = `propose-answer-button-${conversation.SK}`;
                if (handleLoginIfNeeded(buttonId)) return;
                handleRestrictedAction('conclusion', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: conversation.SK })
              }}
            >
              {getProposeSolutionButtonText(conversation.ConvoType)}
            </button>
          </div>
        </div>
      </div>
      
     {/* Invite Participants Form (for conversation owner) */}
     {isConversationOwner() && inviteFormOpen && (
       <ConversationInviteForm
         onCancel={handleCancelForm}
         onSend={async (data) => {
           setInviteSubmitting(true);
           setInviteFormError(null);
           try {
             await ConversationService.sendConversationInvite(
               conversation.PK,
               username!,
               data.name,
               data.email
             );
             setInfoMessage(`Your invite to ${data.name} (${data.email}) has been successfully sent.`);
             setInviteFormOpen(false);
             setActiveForm(null);
           } catch (err: any) {
             setInviteFormError(err?.message || 'Failed to send invite');
           } finally {
             setInviteSubmitting(false);
           }
         }}
         isSubmitting={inviteSubmitting}
         formError={inviteFormError}
         authorEmail={email || null}
         marginLeft={`${(postTypeService.getPostDepth(conversation.SK) + 1) * 48}px`}
         id={`invite-form-${conversation.SK}`}
         dataTestId={`invite-form-${conversation.SK}`}
       />
     )}

      <h2 style={{ 
        fontSize: '1.5rem',
        margin: '32px 0 16px 0',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--color-border, #444)'
      }}>
        Responses
      </h2>
      
      {/* --- Render Forms for Main Conversation --- */}
      {activeForm && activeForm.type !== 'invite' && activeForm.context.insertAfterSK === conversation?.SK && (
                  <ConversatonThreadAppendPostForm
                    title={`${activeForm.type === 'comment' ? 'Comment' : activeForm.type === 'drilldown' ? getAddSubActionButtonText(conversation.ConvoType) : getProposeSolutionButtonText(conversation.ConvoType)}`}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={handleCancelForm}
                    onPost={handleSubmit}
                    isSubmitting={isSubmitting}
                    formError={formError}
                    showOwnershipInfo={showOwnershipInfo}
                    author={conversation.Author}
                    marginLeft={`${(postTypeService.getPostDepth(conversation.SK) + 1) * 48}px`}
                    id={`${activeForm.type}-form-${conversation?.SK || 'main'}`}
                    dataTestId={`${activeForm.type}-form-${conversation.SK}`}
                    requireTitle={activeForm.type !== 'comment'}
                   />      )}
      
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
                
                {(postTypeInfo.isDrillDown || postTypeInfo.isConclusion) && (
                  <div 
                    data-testid={`post-title-${post.SK}`}
                    style={{
                      fontWeight: 700,
                      marginBottom: '8px',
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'normal',
                      overflow: 'visible',
                      wordBreak: 'break-word',
                      maxWidth: '100%'
                    }}
                  >
                    {post.Title}
                  </div>
                )}
                <div style={{ 
                  whiteSpace: 'pre-line',
                  lineHeight: '1.6',
                  marginBottom: '12px'
                }}>
                  {post.MessageBody}
                </div>
                
                <div className="thread-meta-row" style={{ 
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary, #bbbbbb)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-border, #333)'
                }}>
                  <span>by <strong>{post.Author}</strong> • {formatUnixTimestamp(post.UpdatedAt)}</span>
                  <div className="thread-actions">
                    {/* Root conversation post */}
                    {post.SK === 'METADATA' && (
                      <>
                        <button 
                          id={`comment-button-${post.SK}`}
                          data-testid="comment-button" 
                          type="button"
                          className={`button-thread-action ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `comment-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })
                          }}
                        >
                          Comment
                        </button>
                        <button 
                          id={`drill-down-button-${post.SK}`}
                          data-testid="drill-down-button" 
                          type="button"
                          className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `drill-down-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleRestrictedAction('drilldown', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })
                          }}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button 
                          id={`propose-answer-button-${post.SK}`} 
                          data-testid="propose-answer-button" 
                          type="button"
                          className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `propose-answer-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleRestrictedAction('conclusion', { conversationPK: conversation.PK, parentPostSK: '', insertAfterSK: post.SK })
                          }}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    {/* Comment post */}
                    {isComment && post.SK !== 'METADATA' && (
                      <button 
                        type="button" 
                        id={`reply-quote-button-${post.SK}`}
                        data-testid="reply-quote-button" 
                        className={`button-thread-action ${!!activeForm ? 'button-disabled' : ''}`}
                        disabled={!!activeForm}
                        onClick={() => {
                          const buttonId = `reply-quote-button-${post.SK}`;
                          if (handleLoginIfNeeded(buttonId)) return;
                          handleReplyWithQuoteClick(post)
                        }}
                      >
                        Reply with quote
                      </button>
                    )}
                    
                    {/* Drill-down post */}
                    {isDrillDown && !isConclusion && (
                      <>
                        <button 
                          type="button" 
                          id={`comment-button-${post.SK}`}
                          data-testid="comment-button" 
                          className={`button-thread-action ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `comment-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleOpenForm('comment', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })
                          }}
                        >
                          Comment
                        </button>
                        <button 
                          type="button" 
                          id={`drill-down-button-${post.SK}`}
                          data-testid="drill-down-button" 
                          className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `drill-down-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleRestrictedAction('drilldown', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })
                          }}
                        >
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button 
                          type="button" 
                          id={`propose-answer-button-${post.SK}`}
                          data-testid="propose-answer-button" 
                          className={`button-thread-action button-margin-left ${!!activeForm ? 'button-disabled' : ''}`}
                          disabled={!!activeForm}
                          onClick={() => {
                            const buttonId = `propose-answer-button-${post.SK}`;
                            if (handleLoginIfNeeded(buttonId)) return;
                            handleRestrictedAction('conclusion', { conversationPK: conversation.PK, parentPostSK: post.SK, insertAfterSK: post.SK })
                          }}
                        >
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    
                  </div>
                </div>
              </div>

              {/* --- Render Forms for this specific post --- */}
              {activeForm && activeForm.type !== 'invite' && activeForm.context.insertAfterSK === post.SK && (
                <ConversatonThreadAppendPostForm
                  title={`${activeForm.type === 'comment' ? 'Comment' : activeForm.type === 'drilldown' ? getAddSubActionButtonText(conversation.ConvoType) : getProposeSolutionButtonText(conversation.ConvoType)}`}
                  formData={formData}
                  setFormData={setFormData}
                  onCancel={handleCancelForm}
                  onPost={handleSubmit}
                  isSubmitting={isSubmitting}
                  formError={formError}
                  showOwnershipInfo={showOwnershipInfo}
                  author={conversation.Author}
                  marginLeft={`${activeForm.type === 'comment' ? newCommentDepth * 48 : (depth + 1) * 48}px`}
                  id={`${activeForm.type}-form-${post.SK}`}
                  dataTestId={`${activeForm.type}-form-${post.SK}`}
                  requireTitle={activeForm.type !== 'comment'}
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



export default ConversationThread;
