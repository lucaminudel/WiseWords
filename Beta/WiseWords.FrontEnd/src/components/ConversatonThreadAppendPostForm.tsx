import React from 'react';

// --- Generic Form Rendering Function ---
export const ConversatonThreadAppendPostForm = ({
  title,
  formData,
  setFormData,
  onCancel,
  onPost,
  isSubmitting,
  formError,
  marginLeft,
  id,
  dataTestId
}: {
  title: string;
  formData: { author: string; messageBody: string };
  setFormData: React.Dispatch<React.SetStateAction<{ author: string; messageBody: string }>>;
  onCancel: () => void;
  onPost: () => Promise<void>;
  isSubmitting: boolean;
  formError: string | null;
  marginLeft: string;
  id: string;
  dataTestId: string;
}) => {
  return (
    <div
      id={id}
      data-testid={dataTestId}
      style={{
        marginLeft,
        marginTop: '16px',
        padding: '16px',
        backgroundColor: 'var(--color-background-secondary, #2a2a2a)',
        borderRadius: '8px',
        border: '2px solid var(--color-accent)',
        color: 'var(--color-text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{
        color: 'var(--color-accent)',
        fontWeight: 600,
        marginBottom: '16px',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
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
            data-testid="post-editor-textarea"
            value={formData.messageBody}
            onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
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
            data-testid="post-editor-author"
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
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
            data-testid="cancel-button"
            onClick={onCancel}
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
            data-testid="post-button"
            onClick={onPost}
            disabled={!formData.author.trim() || !formData.messageBody.trim() || isSubmitting}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-primary)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: (!formData.author.trim() || !formData.messageBody.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
              opacity: (!formData.author.trim() || !formData.messageBody.trim() || isSubmitting) ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? 'Posting...' : (formError ? 'Retry Post' : 'Post')}
          </button>
        </div>
      </div>
    </div>
  );
};