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
    // Intercept environment config to capture the ApiBaseUrl used by the app
    cy.intercept('GET', '**/assets/env.*.json').as('envConfig');

    cy.visit('/conversations');

    cy.wait('@envConfig').then((i) => {
      const api = i.response && (i.response as any).body && (i.response as any).body.ApiBaseUrl ? (i.response as any).body.ApiBaseUrl as string : null;
      if (!api) {
        throw new Error('Failed to resolve ApiBaseUrl from env config');
      }
      cy.wrap(api).as('apiBaseUrl');
    });
    
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(authorName);
    });

    cy.contains('button', 'New Conversation').click();
    cy.get('#new-conversation-form').should('be.visible');

    cy.get('select').select('QUESTION');
    cy.get('textarea[placeholder*="Provide a short summary"]').type('This is a test conversation created by an automated E2E test.');
    cy.get('input[placeholder*="Provide a short title"]').type(conversationTitle);

    // Intercept the create request to capture the created conversation PK
    cy.intercept('POST', '**/conversations').as('createConv');

    cy.contains('button', 'Create').click();

    cy.wait('@createConv').then((i) => {
      const body = (i.response && (i.response as any).body) || {};
      const createdPk = (body && body.PK) as string | undefined;
      if (!createdPk) {
        cy.log('WARN: Could not capture created PK from create response. Cleanup will fall back to search.');
      }
      cy.wrap(createdPk || null).as('createdConversationPk');
    });

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
      cy.get(formSelector).find('input[placeholder*="Title"]').type(`Drill Down ${i} Title`);
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
    cy.get(conclusionFormSelector).find('input[placeholder*="Title"]').type('Root Conclusion Title');
    cy.get(conclusionFormSelector).find('textarea').type('Root Conclusion');
    cy.get(conclusionFormSelector).contains('button', 'Post').click();
    cy.contains('Root Conclusion').should('be.visible');

    // Step 8: Repeat the previous three steps but apply them to one of the drill-down posts
    const drillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 1")';
    cy.get(drillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    
    cy.get('[data-testid^="drilldown-form-"]').find('input[placeholder*="Title"]').type('Nested Drill Down Title');
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
    cy.get('[id^="conclusion-form-"]').find('input[placeholder*="Title"]').type('Nested Conclusion Title');
      cy.get('[id^="conclusion-form-"]').find('textarea').type('Nested Conclusion');
    cy.get('[id^="conclusion-form-"]').contains('button', 'Post').click();
    cy.contains('Nested Conclusion').should('be.visible');

    // Step 9: Do the same again to another of the drill-down posts
    const anotherDrillDownPostSelector = '[data-testid="post-container"]:contains("Drill Down 2")';
    cy.get(anotherDrillDownPostSelector).within(() => {
      cy.get('[data-testid="drill-down-button"]').click();
    });
    cy.get('[data-testid^="drilldown-form-"]').find('input[placeholder*="Title"]').type('Another Nested Drill Down Title');
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
    cy.get('[id^="conclusion-form-"]').find('input[placeholder*="Title"]').type('Another Nested Conclusion Title');
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

    // Cleanup: delete the created conversation via API (AdministrativeNonAtomicDelete)
    cy.log('--- Cleaning up created conversation via API ---');
    const year = new Date().getFullYear();

    cy.get<string>('@apiBaseUrl').then((apiBaseUrl) => {
      cy.get<string | null>('@createdConversationPk').then((createdPk) => {
        if (createdPk) {
          const pkEncoded = encodeURIComponent(createdPk);
          cy.log(`Deleting conversation via API at ${apiBaseUrl}/conversations/${pkEncoded}`);
          cy.request({
            url: `${apiBaseUrl}/conversations/${pkEncoded}`,
            method: 'DELETE',
            failOnStatusCode: false
          }).then(delRes => {
            cy.log(`DELETE status: ${delRes.status}`);
            expect([204, 404, 200, 202]).to.include(delRes.status);
          });
        } else {
          // Fallback: search by year and author if we couldn't capture PK
          cy.request({
            url: `${apiBaseUrl}/conversations?updatedAtYear=${year}&filterByAuthor=${encodeURIComponent(authorName)}`,
            method: 'GET',
            failOnStatusCode: false
          }).then(res => {
            if (res.status !== 200 || !Array.isArray(res.body)) {
              cy.log('Cleanup skipped: failed to query conversations for cleanup');
              return;
            }
            const conversations = res.body as Array<{ PK: string; Title: string; Author: string }>;
            const match = conversations.find(c => c.Title === conversationTitle && c.Author === authorName);
            if (!match) {
              cy.log('Cleanup skipped: created conversation not found');
              return;
            }

            const pkEncoded = encodeURIComponent(match.PK);
            cy.log(`Deleting conversation via API at ${apiBaseUrl}/conversations/${pkEncoded}`);
            cy.request({
              url: `${apiBaseUrl}/conversations/${pkEncoded}`,
              method: 'DELETE',
              failOnStatusCode: false
            }).then(delRes => {
              cy.log(`DELETE status: ${delRes.status}`);
              expect([204, 404, 200, 202]).to.include(delRes.status);
            });
          });
        }
      });
    });
  });
});