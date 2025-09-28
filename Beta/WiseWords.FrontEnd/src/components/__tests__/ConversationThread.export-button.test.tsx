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

vi.mock('../../services/conversationService', () => ({
  ConversationService: {
    fetchConversationPostsViaCachedAPI: (...args: any[]) => mockFetchConversation(...args),
    appendCommentAndUpdateCache: vi.fn(),
    appendDrillDownAndUpdateCache: vi.fn(),
    appendConclusionAndUpdateCache: vi.fn(),
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

describe('ConversationThread - Export conversation button visibility', () => {
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

  it('shows "Export conversation" button when current user is the conversation author', async () => {
    mockAuth.username = 'alice';
    mockFetchConversation.mockResolvedValueOnce([rootConversation]);

    renderWithRouter();

    // Ensure the root post loaded
    await screen.findByTestId('post-container');

    // Expect the Export button to be present for the owner
    const exportBtn = await screen.queryByRole('button', { name: /export conversation/i });
    expect(exportBtn).toBeInTheDocument();
  });

  it('does not show "Export conversation" button when current user is NOT the conversation author', async () => {
    mockAuth.username = 'bob';
    mockFetchConversation.mockResolvedValueOnce([rootConversation]);

    renderWithRouter();

    // Ensure the root post loaded
    await screen.findByTestId('post-container');

    await waitFor(() => {
      const exportBtn = screen.queryByRole('button', { name: /export conversation/i });
      expect(exportBtn).not.toBeInTheDocument();
    });
  });
});
