describe('Full E2E Live API and DB Flow', () => {
  const uniqueId = new Date().getTime();
  const conversationTitle = `Live API Test: ${uniqueId}`;
  const authorName = 'TestDeleteMe';

  it('should create a new conversation, add posts, and verify persistence', () => {
    // Step 1: Create a new conversation
    cy.visit('/conversations');
    
    cy.contains('button', 'New Conversation').click();
    cy.get('#new-conversation-form').should('be.visible');

    cy.get('select').select('QUESTION');
    cy.get('textarea[placeholder*="Provide a short summary"]').type('This is a test conversation created by an automated E2E test.');
    cy.get('input[placeholder*="Provide a short title"]').type(conversationTitle);
    cy.get('input[placeholder="Enter your name"]').type(authorName);

    cy.contains('button', 'Create').click();

    // Step 2: Verify it has been created in the current session
    cy.get('#new-conversation-form').should('not.exist');
    cy.contains(conversationTitle).should('be.visible');
    cy.contains(authorName).should('be.visible');

    // Step 3: Start a new session and verify the conversation is still there
    cy.log('--- Starting new session to verify persistence ---');
    cy.visit('/conversations');

    // Verify the conversation is present after reloading from the server
    cy.contains(conversationTitle).should('be.visible');
    cy.contains(authorName).should('be.visible');

    // Step 4: Visit the new created conversation
    cy.contains(conversationTitle).click();

    // Step 5: Add three drill-down posts to the main root conversation post.
    for (let i = 1; i <= 3; i++) {
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).find('textarea').type(`Drill Down ${i}`);
      cy.get(formSelector).find('input[type="text"]').type(authorName);
      cy.get(formSelector).contains('button', 'Post').click();
      cy.contains(`Drill Down ${i}`).should('be.visible');
    }

    // Step 6: Add a comment to the main root conversation post.
    cy.get('[data-testid="post-container"]').first().within(() => {
      cy.get('[data-testid="comment-button"]').click();
    });
    const commentFormSelector = '#comment-form-METADATA';
    cy.get(commentFormSelector).find('textarea').type('Root Comment');
    cy.get(commentFormSelector).find('input[type="text"]').type(authorName);
    cy.get(commentFormSelector).contains('button', 'Post').click();
    cy.contains('Root Comment').should('be.visible');

    // Step 7: Add a conclusion to the main root conversation post.
    cy.get('[data-testid="post-container"]').first().within(() => {
      cy.get('[data-testid="propose-answer-button"]').click();
    });
    const conclusionFormSelector = '#conclusion-form-METADATA';
    cy.get(conclusionFormSelector).find('textarea').type('Root Conclusion');
    cy.get(conclusionFormSelector).find('input[type="text"]').type(authorName);
    cy.get(conclusionFormSelector).contains('button', 'Post').click();
    cy.contains('Root Conclusion').should('be.visible');

    // Step 8: Repeat the previous three steps but apply them to one of the drill-down posts
    const drillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 1")';
    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    
    cy.get('[data-testid^="drilldown-form-"]').find('textarea').type('Nested Drill Down');
    cy.get('[data-testid^="drilldown-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[data-testid^="drilldown-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Drill Down').should('be.visible');

    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="comment-button"]').click();
    });
    cy.get('[id^="comment-form-"]').find('textarea').type('Nested Comment');
    cy.get('[id^="comment-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[id^="comment-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Comment').should('be.visible');

    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="propose-answer-button"]').click();
    });
    cy.get('[id^="conclusion-form-"]').find('textarea').type('Nested Conclusion');
    cy.get('[id^="conclusion-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[id^="conclusion-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Conclusion').should('be.visible');

    // Step 9: Do the same again to another of the drill-down posts
    const anotherDrillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 2")';
    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    cy.get('[data-testid^="drilldown-form-"]').find('textarea').type('Another Nested Drill Down');
    cy.get('[data-testid^="drilldown-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[data-testid^="drilldown-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Drill Down').should('be.visible');

    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="comment-button"]').click();
    });
    cy.get('[id^="comment-form-"]').find('textarea').type('Another Nested Comment');
    cy.get('[id^="comment-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[id^="comment-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Comment').should('be.visible');

    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="propose-answer-button"]').click();
    });
    cy.get('[id^="conclusion-form-"]').find('textarea').type('Another Nested Conclusion');
    cy.get('[id^="conclusion-form-"]').find('input[type="text"]').type(authorName);
    cy.get('[id^="conclusion-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Conclusion').should('be.visible');

    // Step 10: Start a new browser session and verify the new posts are still there
    cy.log('--- Starting new session to verify posts persistence ---');
    cy.visit('/conversations');
    cy.contains(conversationTitle).click();

    cy.contains('Drill Down 1').should('be.visible');
    cy.contains('Drill Down 2').should('be.visible');
    cy.contains('Drill Down 3').should('be.visible');
    cy.contains('Root Comment').should('be.visible');
    cy.contains('Root Conclusion').should('be.visible');
    cy.contains('Nested Drill Down').should('be.visible');
    cy.contains('Nested Comment').should('be.visible');
    cy.contains('Nested Conclusion').should('be.visible');
    cy.contains('Another Nested Drill Down').should('be.visible');
    cy.contains('Another Nested Comment').should('be.visible');
    cy.contains('Another Nested Conclusion').should('be.visible');
  });
});
