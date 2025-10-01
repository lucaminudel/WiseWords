import React from 'react';

interface ConversationInviteFormProps {
  onCancel: () => void;
  onSend: (data: { name: string; email: string; cc: boolean }) => void;
  isSubmitting: boolean;
  formError: string | null;
  authorEmail: string | null;
  marginLeft?: string;
  id: string;
  dataTestId: string;
}

export const ConversationInviteForm: React.FC<ConversationInviteFormProps> = ({
  onCancel,
  onSend,
  isSubmitting,
  formError,
  authorEmail,
  marginLeft = '0px',
  id,
  dataTestId,
}) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [cc] = React.useState(true); // Always true, disabled checkbox
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setValidationError('Name is required.');
      return;
    }

    if (!trimmedEmail) {
      setValidationError('Email is required.');
      return;
    }

    if (emailRef.current && !emailRef.current.checkValidity()) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setValidationError(null);
    onSend({ name: trimmedName, email: trimmedEmail, cc });
  };

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
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          color: 'var(--color-accent)',
          fontWeight: 600,
          marginBottom: '16px',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Invite participants
      </div>

      {validationError && (
        <div
          style={{
            color: 'var(--color-danger)',
            backgroundColor: 'rgba(255, 79, 90, 0.1)',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid var(--color-danger)',
          }}
        >
          {validationError}
        </div>
      )}

      {formError && (
        <div
          style={{
            color: 'var(--color-danger)',
            backgroundColor: 'rgba(255, 79, 90, 0.1)',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid var(--color-danger)',
          }}
        >
          {formError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label 
            htmlFor={`${id}-name`}
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}
          >
            Name (used in the email greeting)
          </label>
          <input
            id={`${id}-name`}
            ref={nameRef}
            type="text"
            placeholder="Enter the invitee's name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
            disabled={isSubmitting}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
            }}
          />
        </div>

        <div>
          <label 
            htmlFor={`${id}-email`}
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}
          >
            Send to Email address
          </label>
          <input
            id={`${id}-email`}
            ref={emailRef}
            type="email"
            placeholder="Enter the invitee's email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
            disabled={isSubmitting}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={true} disabled={true} />
          <label style={{ color: 'var(--color-text-primary)' }}>
            put me in cc in the invitation ({authorEmail || 'author@example.com'})
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            data-testid="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`button-secondary ${isSubmitting ? 'button-disabled' : ''}`}
          >
            Cancel
          </button>
          <button
            data-testid="send-button"
            onClick={handleSend}
            disabled={isSubmitting}
            className={`button-primary ${isSubmitting ? 'button-disabled' : ''}`}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
