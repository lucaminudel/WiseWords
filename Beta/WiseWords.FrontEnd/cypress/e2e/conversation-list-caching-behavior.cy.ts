/**
 * E2E tests for conversation list caching behavior.
 * This file consolidates all caching-related tests for navigation, refresh, creation,
 * and back/forward browser actions.
 */
describe('Conversation List - Caching Behavior', () => {
  // --- Helper Functions and Data ---

  const mockConversations = [
    { PK: "CONVO#existing-1", SK: "METADATA", Title: "Existing Conversation 1", MessageBody: "Body 1", Author: "User1", ConvoType: "QUESTION", UpdatedAt: "1640995200" },
    { PK: "CONVO#existing-2", SK: "METADATA", Title: "Existing Conversation 2", MessageBody: "Body 2", Author: "User2", ConvoType: "PROBLEM", UpdatedAt: "1640995300" }
  ];

  const newConversation = { PK: "CONVO#new-1", SK: "METADATA", Title: "New Conversation", MessageBody: "New Body", Author: "NewUser", ConvoType: "DILEMMA", UpdatedAt: "1640995400" };

  /**
   * Retries a cy.reload() command until a specified API call occurs.
   * This is used to make refresh-dependent tests more robust.
   * @param {string} alias - The Cypress alias for the intercepted API route.
   * @param {number} maxAttempts - The maximum number of refresh attempts.
   */
  const attemptRefresh = (alias, maxAttempts = 4) => {
    cy.wrap({ attempts: 0 }).then(function (obj) {
      const tryRefresh = () => {
        obj.attempts++;
        cy.log(`Refresh attempt #${obj.attempts} for alias ${alias}`);
        
        // Append a unique hash to the URL to help bust the cache, then reload
        cy.visit(`/conversations#refresh-${obj.attempts}`);
        cy.reload();

        // A longer wait can be necessary for the reload and API call to register
        cy.wait(1500).then(() => {
          cy.get(alias + '.all').then((interceptions) => {
            if (interceptions.length > 0) {
              cy.log(`Refresh successful for ${alias}!`);
              return;
            }
            if (obj.attempts < maxAttempts) {
              tryRefresh();
            } else {
              assert.fail(`API refresh was not triggered for alias ${alias} within ${maxAttempts} attempts.`);
            }
          });
        });
      };
      tryRefresh();
    });
    // Wait for the aliased route to ensure the test synchronizes correctly after refresh
    cy.wait(alias);
  };

  beforeEach(() => {
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  // --- Test Cases ---

  context('Initial Load and Basic Caching', () => {
    it('should fetch from API on first visit and populate cache', () => {
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { statusCode: 200, body: mockConversations }).as('getConversations');
      cy.visit('/conversations');
      cy.wait('@getConversations');
      cy.contains('Existing Conversation 1').should('be.visible');
      cy.window().then((win) => {
        expect(win.sessionStorage.getItem('conversationListCache')).to.not.be.null;
      });
    });

    it('should handle cache errors gracefully by falling back to API', () => {
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { statusCode: 200, body: mockConversations }).as('getFallback');
      cy.window().then((win) => {
        win.sessionStorage.setItem('conversationListCache', 'invalid-json');
      });
      cy.visit('/conversations');
      cy.wait('@getFallback');
      cy.contains('Existing Conversation 1').should('be.visible');
    });

    it('should make only one API call on initial load', () => {
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { 
        statusCode: 200, 
        body: mockConversations 
      }).as('getConversations');
      
      cy.visit('/conversations');
      cy.wait('@getConversations');
      
      // Verify only one API call was made
      cy.get('@getConversations.all').should('have.length', 1);
      
      cy.contains('Existing Conversation 1').should('be.visible');
    });
  });

  context('Navigation and Refresh Scenarios', () => {
    beforeEach(() => {
      // Ensure cache is populated before each test in this context
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { statusCode: 200, body: mockConversations }).as('getInitial');
      cy.visit('/conversations');
      cy.wait('@getInitial');
    });

    it('should load from cache when navigating back from another page', () => {
      cy.visit('/'); // Navigate away
      cy.intercept('GET', '**/conversations?updatedAtYear=2025').as('getFromCache');
      cy.visit('/conversations'); // Navigate back
      cy.contains('Existing Conversation 1').should('be.visible');
      cy.wait(500); // Wait to ensure no unexpected API call
      cy.get('@getFromCache.all').should('have.length', 0);
    });

    it('should load from cache when using browser back button from a thread', () => {
      cy.intercept('GET', '**/conversations/CONVO%23existing-1/posts', { statusCode: 200, body: [mockConversations[0]] }).as('getPosts');
      cy.contains('a', 'Existing Conversation 1').click();
      cy.wait('@getPosts');
      cy.go('back');

      cy.intercept('GET', '**/conversations?updatedAtYear=2025').as('getAfterBack');
      cy.url().should('match', /\/conversations$/);
      cy.contains('Existing Conversation 1').should('be.visible');
      cy.wait(500);
      cy.get('@getAfterBack.all').should('have.length', 0);
    });

    it.skip('should refresh data on reload and use the updated cache for subsequent navigation', () => {
      // 1. Define updated data that will be fetched after the refresh
      const refreshedConversations = [{ PK: "CONVO#refreshed-1", Title: "Refreshed Conversation", Author: "RefreshUser" }, ...mockConversations];
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { statusCode: 200, body: refreshedConversations }).as('getRefreshed');
      
      // 2. Use the helper to reload the page until the API call is successful
      attemptRefresh('@getRefreshed');
      
      // 3. Verify that the UI shows the new data
      cy.contains('Refreshed Conversation').should('be.visible');
      cy.window().then((win) => {
        const parsed = JSON.parse(win.sessionStorage.getItem('conversationListCache'));
        expect(parsed[0].Title).to.equal('Refreshed Conversation');
      });

      // 4. Navigate to the new conversation thread and then back
      cy.intercept('GET', '**/conversations/CONVO%23refreshed-1/posts', { statusCode: 200, body: [refreshedConversations[0]] }).as('getNewPosts');
      cy.contains('a', 'Refreshed Conversation').click();
      cy.wait('@getNewPosts');
      cy.go('back');

      // 5. Verify that the refreshed data is still displayed and no new API call was made
      cy.intercept('GET', '**/conversations?updatedAtYear=2025').as('getAfterBack');
      cy.contains('Refreshed Conversation').should('be.visible');
      cy.wait(500);
      cy.get('@getAfterBack.all').should('have.length', 0);
    });
  });

  context('Cache Updates from User Actions', () => {
    it('should update cache and UI immediately after creating a new conversation', () => {
      cy.intercept('GET', '**/conversations?updatedAtYear=2025', { statusCode: 200, body: mockConversations }).as('getInitial');
      cy.intercept('POST', '**/conversations', { statusCode: 200, body: newConversation }).as('createConversation');
      cy.visit('/conversations');
      cy.wait('@getInitial');

      cy.contains('button', 'New Conversation').click();
      cy.get('select').select('DILEMMA');
      cy.get('textarea[placeholder*="Provide a short summary"]').type(newConversation.MessageBody);
      cy.get('input[placeholder*="Provide a short title"]').type(newConversation.Title);
      cy.get('input[placeholder="Enter your name"]').type(newConversation.Author);
      cy.contains('button', 'Create').click();
      cy.wait('@createConversation');

      cy.get('tbody tr').first().should('contain', 'New Conversation');
      cy.window().then((win) => {
        const parsed = JSON.parse(win.sessionStorage.getItem('conversationListCache'));
        expect(parsed[0].Title).to.equal('New Conversation');
      });
    });
  });
});
