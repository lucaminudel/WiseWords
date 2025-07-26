import React, { useEffect, useState } from 'react';
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

const ConversationThread: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const { title, type } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  


  useEffect(() => {
    const fetchConversation = async () => {
      try {
        if (!conversationId) return;

        const data = await ConversationService.fetchConversationPosts(conversationId);
        
        // The last item is the conversation metadata
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

    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId]);

  // Get conversation type color
  // getConversationTypeColor moved to utils/conversationUtils.ts


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
              textAlign: 'center',
              color: 'var(--text-color)',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'normal',
              fontStyle: 'normal'
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
            <button data-testid="comment-button" type="button" style={buttonStyle}>Comment</button>
            <button data-testid="sub-question-button" type="button" style={{ ...buttonStyle, marginLeft: '8px' }}>
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
      
      {sortPosts([conversation, ...posts]).length <= 1 ? (
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
            
            return (
              <div 
                key={post.SK}
                data-testid="post-container"
                style={{ 
                  marginLeft: `${Math.min(depth, 3) * 48}px`,
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
                        <button data-testid="comment-button" style={buttonStyle}>Comment</button>
                        <button data-testid="sub-question-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button data-testid="propose-answer-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    {/* Comment post */}
                    {isComment && post.SK !== 'METADATA' && (
                      <button type="button" data-testid="reply-quote-button" style={buttonStyle}>Reply with quote</button>
                    )}
                    
                    {/* Drill-down post */}
                    {isDrillDown && !isConclusion && (
                      <>
                        <button type="button" data-testid="comment-button" style={buttonStyle}>Comment</button>
                        <button type="button" data-testid="sub-question-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getAddSubActionButtonText(conversation.ConvoType)}
                        </button>
                        <button type="button" data-testid="propose-answer-button" style={{ ...buttonStyle, marginLeft: '8px' }}>
                          {getProposeSolutionButtonText(conversation.ConvoType)}
                        </button>
                      </>
                    )}
                    
                    {/* Conclusion post */}
                    {isConclusion && (
                      <button type="button" data-testid="comment-button" style={buttonStyle}>Comment</button>
                    )}
                  </div>
                </div>
              </div>
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
