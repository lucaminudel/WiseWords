describe('Conversation Thread Drill Down Workflow', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
    cy.visitConversation('CONVO#123');
    cy.wait('@getConversationPosts');
  });

  context('Drilling down on the Root Conversation Post', () => {
    it('should post a new drill down on the Conversation root post successfully', () => {
      const newDrillDown = {
        author: 'Test Author',
        message: 'This is a brand new drill down on the root post.'
      };

      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });

      // 2. Verify the drill down form appears with the correct indentation (Level 1)
      // The form is attached to the root post, which has SK 'METADATA'
      const formId = '#drill-down-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '48px');

      // 3. Fill out the author and message fields
      cy.get(formId).find('textarea').type(newDrillDown.message);
      cy.get(formId).find('input[type="text"]').type(newDrillDown.author);

      // 4. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#DD#new-drill-down-guid',
          Author: newDrillDown.author,
          MessageBody: newDrillDown.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postDrillDown');

      cy.get(formId).contains('button', 'Post').click();

      // 5. Assert that the API call was made with the correct parameters
      cy.wait('@postDrillDown').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal('');
        expect(request.body.Author).to.equal(newDrillDown.author);
        expect(request.body.MessageBody).to.equal(newDrillDown.message);
        expect(request.body.NewDrillDownGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 6. Assert that the new drill down appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newDrillDown.message).as('NewDrillDownPost');
      cy.get('@NewDrillDownPost').should('be.visible');
      cy.get('@NewDrillDownPost').should('contain.text', newDrillDown.author);
      cy.get('@NewDrillDownPost').should('have.css', 'margin-left', '48px'); // Level 1 indentation

      // 7. Assert that the drill down form is now hidden
      cy.get(formId).should('not.exist');
    });

    it('should cancel posting a new drill down', () => {
      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#drill-down-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type('This drill down should be cancelled.');
      cy.get(formId).find('input[type="text"]').type('A. User');

      // 4. Click the "Cancel" button
      cy.get(formId).contains('button', 'Cancel').click();

      // 5. Assert that the form is now hidden
      cy.get(formId).should('not.exist');

      // 6. Assert that no new drill down was added to the thread
      cy.contains('[data-testid="post-container"]', 'This drill down should be cancelled.').should('not.exist');

      // 7. Re-open the form and assert that it is empty
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });
      cy.get(formId).find('textarea').should('have.value', '');
      cy.get(formId).find('input[type="text"]').should('have.value', '');
    });

    it('should display an error message and keep form content on API error', () => {
      const newDrillDown = {
        author: 'Error Author',
        message: 'This drill down should fail to post.'
      };

      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#drill-down-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type(newDrillDown.message);
      cy.get(formId).find('input[type="text"]').type(newDrillDown.author);

      // 4. Set up intercept for the API call to return an error
      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('postDrillDownError');

      // 5. Click the "Post" button
      cy.get(formId).contains('button', 'Post').click();

      // 6. Assert that the API call was made
      cy.wait('@postDrillDownError');

      // 7. Assert that a user-friendly error message is displayed within the form
      cy.get(formId).contains('Failed to post drill down.').should('be.visible');

      // 8. Assert that the form remains visible and its content is preserved
      cy.get(formId).should('be.visible');
      cy.get(formId).find('textarea').should('have.value', newDrillDown.message);
      cy.get(formId).find('input[type="text"]').should('have.value', newDrillDown.author);
    });
  });

  context('Drilling down on a Nested Drill-Down Post', () => {
    it('should post a new drill down successfully on a nested post', () => {
      const newDrillDown = {
        author: 'Nested Drill Down Author',
        message: 'This is a reply to a nested sub-question.'
      };
      const parentPostText = 'Nested sub-question';
      const parentPostSK = '#DD#1#DD#1';

      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the nested drill-down post
      cy.contains('[data-testid="post-container"]', parentPostText).within(() => {
        cy.get('[data-testid="drill-down-button"]').click();
      });

      // 2. Verify the drill down form appears with the correct, deeper indentation
      const formId = `[id="drill-down-form-${parentPostSK}"]`;
      
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '144px'); // Depth 2 (parent) + 1 = 3 * 48px

      // 3. Fill out the form and set up the API intercept
      cy.get(formId).find('textarea').type(newDrillDown.message);
      cy.get(formId).find('input[type="text"]').type(newDrillDown.author);

      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSK}#DD#new-nested-guid`,
          Author: newDrillDown.author,
          MessageBody: newDrillDown.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postNestedDrillDown');

      cy.get(formId).contains('button', 'Post').click();

      // 4. Assert the API call is made correctly
      cy.wait('@postNestedDrillDown').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal(parentPostSK);
        expect(request.body.Author).to.equal(newDrillDown.author);
        expect(request.body.MessageBody).to.equal(newDrillDown.message);
      });

      // 5. Assert the new drill down appears correctly under its parent
      const newDrillDownSelector = `[data-testid="post-container"]:contains("${newDrillDown.message}")`;
      cy.get(newDrillDownSelector).should('be.visible');
      cy.get(newDrillDownSelector).should('contain.text', newDrillDown.author);
      cy.get(newDrillDownSelector).should('have.css', 'margin-left', '144px'); // Depth 3 indentation

      // Assert form is hidden
      cy.get(formId).should('not.exist');
    });
  });
});
