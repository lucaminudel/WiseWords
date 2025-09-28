import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ConversationThread from '../ConversationThread';

// Mutable mocks to control per-test behavior
const mockAuth: any = {
  processAuthCallbackIfPresent: vi.fn(),
  isAuthenticated: true,
  username: 'alice',
  email: 'alice@example.com',
  IsCognitoAuthEnabled: false,
  login: vi.fn(),
  logout: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue(null),
  authError: null,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockFetchConversation = vi.fn();
const mockInviteParticipants = vi.fn();

vi.mock('../../services/conversationService', () => ({
  ConversationService: {
    fetchConversationPostsViaCachedAPI: (...args: any[]) => mockFetchConversation(...args),
    appendCommentAndUpdateCache: vi.fn(),
    appendDrillDownAndUpdateCache: vi.fn(),
    appendConclusionAndUpdateCache: vi.fn(),
    inviteParticipants: (...args: any[]) => mockInviteParticipants(...args),
  },
}));

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={[`/conversations/abc`]}>
      <Routes>
        <Route path="/conversations/:conversationId" element={<ConversationThread />} />
      </Routes>
    </MemoryRouter>
  );
}

const rootConversation = {
  PK: 'CONVO#abc',
  SK: 'METADATA',
  Title: 'A test title',
  MessageBody: 'Root message',
  Author: 'alice',
  UpdatedAt: '1700000000',
  ConvoType: 'QUESTION',
};

describe('ConversationThread - Invite Participants button visibility', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.processAuthCallbackIfPresent = vi.fn();
    mockAuth.isAuthenticated = true;
    mockAuth.IsCognitoAuthEnabled = false;
    mockAuth.login = vi.fn();
    mockAuth.logout = vi.fn();
    mockAuth.getIdToken = vi.fn().mockResolvedValue(null);
    mockAuth.authError = null;
  });

  it('shows "Invite Participants" button when current user is the conversation author', async () => {
    mockAuth.username = 'alice';
    mockFetchConversation.mockResolvedValueOnce([rootConversation]);

    renderWithRouter();

    // Ensure the root post loaded
    await screen.findByTestId('post-container');

    // Expect the Invite Participants button to be present for the owner
    const inviteBtn = await screen.queryByRole('button', { name: /invite participants/i });
    expect(inviteBtn).toBeInTheDocument();
  });

  it('does not show "Invite Participants" button when current user is NOT the conversation author', async () => {
    mockAuth.username = 'bob';
    mockFetchConversation.mockResolvedValueOnce([rootConversation]);

    renderWithRouter();

    // Ensure the root post loaded
    await screen.findByTestId('post-container');

    await waitFor(() => {
      const inviteBtn = screen.queryByRole('button', { name: /invite participants/i });
      expect(inviteBtn).not.toBeInTheDocument();
    });
  });
});
