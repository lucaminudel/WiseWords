describe('Conversation Thread Loading Behavior', () => {
  const conversationId = 'CONVO#test-123';
  const conversationUrl = `/conversations/${encodeURIComponent(conversationId)}`;

  const mockConversation = {
    PK: conversationId,
    SK: 'METADATA',
    Title: 'The Meaning of Life',
    MessageBody: 'A profound question for the ages.',
    Author: 'Philosopher',
    UpdatedAt: '1690000000',
    ConvoType: 'QUESTION',
  };

  beforeEach(() => {
    // Intercept the API call to fetch conversation posts with a delay
    cy.intercept('GET', `**${conversationUrl}/posts`, {
      delay: 1000, // 1-second delay to ensure loading state is visible
      statusCode: 200,
      body: [mockConversation],
    }).as('getConversationPosts');
  });

  context('When navigating from the conversations list (with state)', () => {
    const conversationsList = [
      {
        PK: conversationId,
        SK: 'METADATA',
        Title: 'The Meaning of Life',
        Author: 'Philosopher',
        UpdatedAt: '1690000000',
        ConvoType: 'QUESTION',
      },
    ];

    it('should show title and type while loading, then display the full conversation', () => {
      // Mock the conversations list API
      cy.intercept('GET', '**/conversations?updatedAtYear=*', {
        statusCode: 200,
        body: conversationsList,
      }).as('getConversations');

      // Visit the conversations list page
      cy.visit('/conversations');
      cy.wait('@getConversations');

      // Click the link to navigate to the thread
      cy.contains('a', mockConversation.Title).click();

      // --- Assertions for loading state ---
      // The title and type should be visible immediately
      cy.contains('h1', mockConversation.Title).should('be.visible');
      cy.contains(mockConversation.ConvoType.toLowerCase()).should('be.visible');
      
      // Assert the exact text for title and type
      cy.get('h1').should('have.text', mockConversation.Title);
      cy.contains(mockConversation.ConvoType.toLowerCase()).should('have.text', mockConversation.ConvoType.toLowerCase());


      // Example on how to save the page html before the assertion failure 
      // in case that the html changes while waiting for the assertion to pass or fail
      // Keywords (for finding again this example in the future): save html, save page, html snapshot, cyclope
      /* cy.get('html').then(($html) => {
        const htmlBeforeAssertion = $html.html(); // This should now work without error
        cy.savePage('cypress/snapshots/pages/loading-state-before-assertion');
      });
      */

      // A loading message should also be present
      cy.contains('Loading Conversation...').should('be.visible');

      // The full message body should not be visible yet
      cy.contains(mockConversation.MessageBody).should('not.exist');

      // --- Assertions for final state ---
      // Wait for the API call to finish
      cy.wait('@getConversationPosts');

      // The loading message should be gone
      cy.contains('Loading Conversation...').should('not.exist');

      // The full conversation content should now be visible
      cy.contains('h1', mockConversation.Title).should('be.visible');
      cy.contains(mockConversation.MessageBody).should('be.visible');
      cy.contains(`by ${mockConversation.Author}`).should('be.visible');      
    });
  });

  context('When loading the page directly (without state)', () => {
    it('should show a generic loading message, then display the full conversation', () => {
      // Visit the conversation thread page directly
      cy.visit(conversationUrl);

      // --- Assertions for loading state ---
      // A generic loading message should be visible
      cy.contains('Loading Conversation...').should('be.visible');

      // The title and type should NOT be visible yet
      cy.get('h1').should('not.exist');
      cy.contains(mockConversation.ConvoType.toLowerCase()).should('not.exist');

      // --- Assertions for final state ---
      // Wait for the API call to finish
      cy.wait('@getConversationPosts');

      // The loading message should be gone
      cy.contains('Loading Conversation...').should('not.exist');

      // The full conversation content should now be visible
      cy.contains('h1', mockConversation.Title).should('be.visible');
      cy.contains(mockConversation.MessageBody).should('be.visible');
      cy.contains(`by ${mockConversation.Author}`).should('be.visible');
    });

    it('should make only one API call on initial load', () => {
      // Visit the conversation thread page directly
      cy.visit(conversationUrl);

      // Wait for the API call to finish
      cy.wait('@getConversationPosts');

      // Assert that the API was called exactly once
      cy.get('@getConversationPosts.all').should('have.length', 1);
    });
  });
});