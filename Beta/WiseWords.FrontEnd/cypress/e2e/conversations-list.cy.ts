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
});
