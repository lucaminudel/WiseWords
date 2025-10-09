import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ConversationsList from '../ConversationsList';
import ConversationThread from '../ConversationThread';

// Minimal, mutable auth mock used by both pages
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

// Service mocks used by each page
const mockFetchConversations = vi.fn();
const mockFetchConversationPosts = vi.fn();

vi.mock('../../services/conversationService', () => ({
  ConversationService: {
    fetchConversationsViaCachedAPI: (...args: any[]) => mockFetchConversations(...args),
    fetchConversationPostsViaCachedAPI: (...args: any[]) => mockFetchConversationPosts(...args),
    appendCommentAndUpdateCache: vi.fn(),
    appendDrillDownAndUpdateCache: vi.fn(),
    appendConclusionAndUpdateCache: vi.fn(),
  },
}));

function renderConversationsList() {
  mockFetchConversations.mockResolvedValueOnce([]);
  return render(
    <MemoryRouter initialEntries={[`/conversations`]}>
      <Routes>
        <Route path="/conversations" element={<ConversationsList />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderConversationThread() {
  const rootConversation = {
    PK: 'CONVO#abc',
    SK: 'METADATA',
    Title: 'A test title',
    MessageBody: 'Root message',
    Author: 'alice',
    UpdatedAt: '1700000000',
    ConvoType: 'QUESTION',
  };
  mockFetchConversationPosts.mockResolvedValueOnce([rootConversation]);

  return render(
    <MemoryRouter initialEntries={[`/conversations/abc`]}>
      <Routes>
        <Route path="/conversations/:conversationId" element={<ConversationThread />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Logo link behavior', () => {
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

  it('links to "/" on the ConversationsList page', async () => {
    renderConversationsList();

    // Scope within the header where the logo lives
    const header = await screen.findByRole('banner');
    const logoLink = within(header).getByRole('link');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('links to "/conversations" on the ConversationThread page', async () => {
    renderConversationThread();

    // The thread page uses a header for logo as well; scope within banner
    const header = await screen.findByRole('banner');
    const headerLogo = within(header).getByRole('link');
    expect(headerLogo).toHaveAttribute('href', '/conversations');

    // There might be a second logo instance elsewhere (e.g., above thread).
    // Fallback: check all links for the logo class and assert href.
    const allLinks = screen.getAllByRole('link');
    const logoLinks = allLinks.filter(a => a.className.includes('_link_'));
    for (const link of logoLinks) {
      expect(link).toHaveAttribute('href', '/conversations');
    }
  });
});
