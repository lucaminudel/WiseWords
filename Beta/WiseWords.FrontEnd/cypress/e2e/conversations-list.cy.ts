describe('Conversations List Page', () => {
  beforeEach(() => {
    // Mock the API response for the conversations list
    cy.intercept('GET', '**/conversations?updatedAtYear=2025', {
      statusCode: 200,
      body: [
        {
          PK: 'CONVO#123',
          SK: 'METADATA',
          Title: 'Test Conversation Title',
          Author: 'Tester',
          UpdatedAt: '1690000000',
          ConvoType: 'QUESTION'
        }
      ]
    }).as('getConversations');

    // Mock the thread page response for a robust test
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
        statusCode: 200,
        body: [{
            PK: "CONVO#123",
            SK: "METADATA",
            Title: "Test Conversation Title",
            MessageBody: "Content of the conversation.",
            Author: "Tester",
            UpdatedAt: "1690000000",
            ConvoType: "QUESTION"
        }]
    }).as('getConversationThread');

    // Visit the conversations page
    cy.visit('/conversations');
  });

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  it('should display a list of conversations and allow navigation to a thread', () => {
    // Wait for the API call to complete
    cy.wait('@getConversations');

    // Verify that the conversations are displayed
    cy.contains('h2', 'Conversations').should('be.visible');
    cy.contains('td', 'Test Conversation Title').should('be.visible');

    // Find the link and click it
    cy.contains('a', 'Test Conversation Title').click();

    // Assert that the URL has changed
    cy.url().should('include', '/conversations/123');

    // Wait for the second API call to be made
    cy.wait('@getConversationThread');
    cy.contains('h1', 'Test Conversation Title').should('be.visible');
  });

  it('should show and hide the new conversation form on button clicks', () => {
    // The form should not be visible initially
    cy.get('#new-conversation-form').should('not.exist');

    // Stub the prompt before clicking the button
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Test Author');
    });

    // Click the "New Conversation" button
    cy.contains('button', 'New Conversation').click();

    // The form should now be visible
    cy.get('#new-conversation-form').should('be.visible');
    cy.contains('h3', 'Create New Conversation').should('be.visible');

    // Click the "Cancel" button
    cy.contains('button', 'Cancel').click();

    // The form should be hidden again
    cy.get('#new-conversation-form').should('not.exist');
  });

  it('should scroll down to the new conversation form when it appears', () => {
    // 1. Setup: Create enough mock data to make the page scrollable.
    const mockConversations = Array.from({ length: 30 }, (_, i) => ({
      PK: `CONVO#test-${i}`,
      SK: 'METADATA',
      Title: `Test Conversation to Induce Scrolling ${i + 1}`,
      Author: 'Tester',
      UpdatedAt: '1690000000',
      ConvoType: 'QUESTION'
    }));

    // Override the default intercept to use our large mock dataset.
    cy.intercept('GET', '**/conversations?updatedAtYear=2025', {
      statusCode: 200,
      body: mockConversations
    }).as('getManyConversations');

    // 2. Visit the page and wait for it to be populated.
    cy.visit('/conversations');
    cy.wait('@getManyConversations');

    // 3. Scroll the "New Conversation" button into view.
    cy.contains('button', 'New Conversation').scrollIntoView();

    // 4. Get the scroll position *before* the click.
    cy.window().its('scrollY').then((scrollYBefore) => {
      // Stub the prompt that may appear in the test environment's login flow.
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Test Author');
      });

      // 5. Click the button to show the form.
      cy.contains('button', 'New Conversation').click();

      // 6. Assert the form is now visible.
      cy.get('#new-conversation-form').should('be.visible');

      // 7. Assert the page has scrolled further down.
      // This is the key assertion that will fail due to the bug.
      cy.window().its('scrollY').should('be.greaterThan', scrollYBefore);
    });
  });
});