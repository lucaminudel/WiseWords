import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockFetchConversation = vi.fn();
const mockSendInvite = vi.fn();

vi.mock('../../services/conversationService', () => ({
  ConversationService: {
    fetchConversationPostsViaCachedAPI: (...args: any[]) => mockFetchConversation(...args),
    appendCommentAndUpdateCache: vi.fn(),
    appendDrillDownAndUpdateCache: vi.fn(),
    appendConclusionAndUpdateCache: vi.fn(),
    sendConversationInvite: (...args: any[]) => mockSendInvite(...args),
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

describe('ConversationThread - Invite Participants form interaction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.username = 'alice';
    mockAuth.isAuthenticated = true;
    mockFetchConversation.mockResolvedValue([rootConversation]);
  });

  it('should call the invite API and show a success message on valid submission', async () => {
    mockSendInvite.mockResolvedValue(undefined); // Simulate successful API call

    renderWithRouter();

    // Wait for the component to load and find the invite button
    const inviteButton = await screen.findByRole('button', { name: /invite participants/i });
    fireEvent.click(inviteButton);

    // The form should now be visible
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByPlaceholderText(/enter the invitee's email address/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(nameInput).toBeInTheDocument();

    // Fill out the form
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.change(emailInput, { target: { value: 'bob@example.com' } });
    fireEvent.click(sendButton);

    // Assert that the service method was called correctly
    await waitFor(() => {
      expect(mockSendInvite).toHaveBeenCalledTimes(1);
      expect(mockSendInvite).toHaveBeenCalledWith(
        rootConversation.PK,
        'alice',
        'Bob',
        'bob@example.com'
      );
    });

    // Assert that the success message is shown
    const successMessage = await screen.findByText(/Your invite to Bob \(bob@example.com\) has been successfully sent./i);
    expect(successMessage).toBeInTheDocument();
  });

  it('should show an error message in the form if the API call fails', async () => {
    const errorMessage = 'Network Error';
    mockSendInvite.mockRejectedValue(new Error(errorMessage)); // Simulate failed API call

    renderWithRouter();

    // Open the form
    const inviteButton = await screen.findByRole('button', { name: /invite participants/i });
    fireEvent.click(inviteButton);

    // Fill out and submit the form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByPlaceholderText(/enter the invitee's email address/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(nameInput, { target: { value: 'Charlie' } });
    fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } });
    fireEvent.click(sendButton);

    // Assert that the service method was called
    await waitFor(() => {
      expect(mockSendInvite).toHaveBeenCalledTimes(1);
    });

    // Assert that the form is still open and an error message is shown
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument(); // Check if form is still there
    const errorAlert = await screen.findByText(errorMessage);
    expect(errorAlert).toBeInTheDocument();
  });
});

