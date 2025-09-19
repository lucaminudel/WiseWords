describe('Conversation Thread Scrolling Behavior', () => {
  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  it('should scroll down to a form when it appears deep in a thread', () => {
    // 1. Setup: Create a mock response with a deeply nested post.
    const conversationId = 'CONVO#123';
    const posts = [
      {
        PK: conversationId,
        SK: 'METADATA',
        Title: 'Deeply Nested Thread',
        MessageBody: 'Root post.',
        Author: 'Root',
        UpdatedAt: '1680000000',
        ConvoType: 'QUESTION'
      }
    ];
    let currentSK = '';
    for (let i = 1; i <= 10; i++) {
      currentSK = i === 1 ? '#DD#1' : `${currentSK}#DD#1`;
      posts.push({
        PK: conversationId,
        SK: currentSK,
        MessageBody: `Drill down level ${i}`,
        Author: `User ${i}`,
        UpdatedAt: (1680000000 + i).toString()
      });
    }
    const deepPostSK = currentSK;

    // Intercept the API call for this specific test
    cy.intercept('GET', `**/conversations/${encodeURIComponent(conversationId)}/posts`, {
      statusCode: 200,
      body: posts
    }).as('getDeepThread');

    // Visit the conversation page
    cy.visit(`/conversations/${conversationId.replace('CONVO#', '')}`);
    cy.wait('@getDeepThread');

    // 2. Find the last post and scroll to it.
    const lastPostSelector = '[data-testid="post-container"]:contains("Drill down level 10")';
    cy.get(lastPostSelector).scrollIntoView();

    // 3. Get scroll position before clicking.
    cy.window().its('scrollY').then((scrollYBefore) => {
      // Stub the prompt that may appear in the test environment's login flow.
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Test Author');
      });

      // 4. Click the "Comment" button on the last post.
      cy.get(lastPostSelector).within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });

      // 5. Assert the form is visible.
      cy.get(`[data-testid="comment-form-${deepPostSK}"]`).should('be.visible');

      // 6. Assert the page has scrolled down.
      cy.window().its('scrollY').should('be.greaterThan', scrollYBefore);
    });
  });
});
