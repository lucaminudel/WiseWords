describe('Full E2E Live API and DB Flow', () => {
  const uniqueId = new Date().getTime();
  const conversationTitle = `Live API Test: ${uniqueId}`;
  const authorName = 'TestDeleteMe';

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  it('should create a new conversation, add posts, and verify persistence', () => {
    // Step 1: Create a new conversation
    cy.visit('/conversations');
    
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(authorName);
    });

    cy.contains('button', 'New Conversation').click();
    cy.get('#new-conversation-form').should('be.visible');

    cy.get('select').select('QUESTION');
    cy.get('textarea[placeholder*="Provide a short summary"]').type('This is a test conversation created by an automated E2E test.');
    cy.get('input[placeholder*="Provide a short title"]').type(conversationTitle);

    cy.contains('button', 'Create').click();

    // Step 2: Verify it has been created in the current session
    cy.get('#new-conversation-form').should('not.exist');
    cy.contains(conversationTitle).should('be.visible');
    cy.contains(authorName).should('be.visible');

    // Step 3: No need to verify the conversation has been persisted beyond the cache
    //         as the following operations would fail without a presited conversation
    
    // Step 4: Visit the new created conversation
    cy.contains(conversationTitle).click();

    // Step 5: Add three drill-down posts to the main root conversation post.
    for (let i = 1; i <= 3; i++) {
      cy.get('#drill-down-button-METADATA').click();
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).find('textarea').type(`Drill Down ${i}`);
      cy.get(formSelector).contains('button', 'Post').click();
      cy.contains(`Drill Down ${i}`).should('be.visible');
    }

    // Step 6: Add a comment to the main root conversation post.
    cy.get('#comment-button-METADATA').click();
    const commentFormSelector = '#comment-form-METADATA';
    cy.get(commentFormSelector).find('textarea').type('Root Comment');
    cy.get(commentFormSelector).contains('button', 'Post').click();
    cy.contains('Root Comment').should('be.visible');

    // Step 7: Add a conclusion to the main root conversation post.
    cy.get('#propose-answer-button-METADATA').click();
    const conclusionFormSelector = '#conclusion-form-METADATA';
    cy.get(conclusionFormSelector).find('textarea').type('Root Conclusion');
    cy.get(conclusionFormSelector).contains('button', 'Post').click();
    cy.contains('Root Conclusion').should('be.visible');

    // Step 8: Repeat the previous three steps but apply them to one of the drill-down posts
    const drillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 1")';
    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    
    cy.get('[data-testid^="drilldown-form-"]').find('textarea').type('Nested Drill Down');
    cy.get('[data-testid^="drilldown-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Drill Down').should('be.visible');

    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="comment-button"]').click();
    });
    cy.get('[id^="comment-form-"]').find('textarea').type('Nested Comment');
    cy.get('[id^="comment-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Comment').should('be.visible');

    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="propose-answer-button"]').click();
    });
    cy.get('[id^="conclusion-form-"]').find('textarea').type('Nested Conclusion');
    cy.get('[id^="conclusion-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Conclusion').should('be.visible');

    // Step 9: Do the same again to another of the drill-down posts
    const anotherDrillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 2")';
    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    cy.get('[data-testid^="drilldown-form-"]').find('textarea').type('Another Nested Drill Down');
    cy.get('[data-testid^="drilldown-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Drill Down').should('be.visible');

    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="comment-button"]').click();
    });
    cy.get('[id^="comment-form-"]').find('textarea').type('Another Nested Comment');
    cy.get('[id^="comment-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Comment').should('be.visible');

    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="propose-answer-button"]').click();
    });
    cy.get('[id^="conclusion-form-"]').find('textarea').type('Another Nested Conclusion');
    cy.get('[id^="conclusion-form-"]').contains('button', 'Post').click();
    cy.contains('Another Nested Conclusion').should('be.visible');

    // Step 10: Verify the new posts have been persisted beyond the cache
    cy.log('--- Verifying posts persistence beyond the cache ---');
    cy.clearLocalStorage();
    cy.reload();

    cy.contains('[data-testid="post-container"]', 'Drill Down 1').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Drill Down 2').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Drill Down 3').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Root Comment').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Root Conclusion').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Nested Drill Down').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Nested Comment').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Nested Conclusion').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Another Nested Drill Down').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Another Nested Comment').should('be.visible');
    cy.contains('[data-testid="post-container"]', 'Another Nested Conclusion').should('be.visible');
  });
});