describe('Conversation Thread Conclusion Workflow', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
    cy.visitConversation('123');
    cy.wait('@getConversationPosts');
  });

  context('Adding Conclusion to the Root Conversation Post', () => {
    it('should post a new conclusion on the Conversation root post successfully', () => {
      const newConclusion = {
        author: 'Test Author',
        message: 'This is a brand new conclusion on the root post.'
      };

      // 1. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });

      // 2. Verify the conclusion form appears with the correct indentation (Level 1)
      // The form is attached to the root post, which has SK 'METADATA'
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '48px');

      // 3. Fill out the author and message fields
      cy.get(formId).find('textarea').type(newConclusion.message);
      cy.get(formId).find('input[type="text"]').type(newConclusion.author);

      // 4. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#CC#new-conclusion-guid',
          Author: newConclusion.author,
          MessageBody: newConclusion.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postConclusion');

      cy.get(formId).contains('button', 'Post').click();

      // 5. Assert that the API call was made with the correct parameters
      cy.wait('@postConclusion').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal('');
        expect(request.body.Author).to.equal(newConclusion.author);
        expect(request.body.MessageBody).to.equal(newConclusion.message);
        expect(request.body.NewConclusionGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 6. Assert that the new conclusion appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newConclusion.message).as('NewConclusionPost');
      cy.get('@NewConclusionPost').should('be.visible');
      cy.get('@NewConclusionPost').should('contain.text', newConclusion.author);
      cy.get('@NewConclusionPost').should('have.css', 'margin-left', '48px'); // Level 1 indentation

      // 7. Assert that the conclusion form is now hidden
      cy.get(formId).should('not.exist');
    });

    it('should cancel posting a new conclusion', () => {
      // 1. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type('This conclusion should be cancelled.');
      cy.get(formId).find('input[type="text"]').type('A. User');

      // 4. Click the "Cancel" button
      cy.get(formId).contains('button', 'Cancel').click();

      // 5. Assert that the form is now hidden
      cy.get(formId).should('not.exist');

      // 6. Assert that no new conclusion was added to the thread
      cy.contains('[data-testid="post-container"]', 'This conclusion should be cancelled.').should('not.exist');

      // 7. Re-open the form and assert that it is empty
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });
      cy.get(formId).find('textarea').should('have.value', '');
      cy.get(formId).find('input[type="text"]').should('have.value', '');
    });

    it('should display an error message and keep form content on API error', () => {
      const newConclusion = {
        author: 'Error Author',
        message: 'This conclusion should fail to post.'
      };

      // 1. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type(newConclusion.message);
      cy.get(formId).find('input[type="text"]').type(newConclusion.author);

      // 4. Set up intercept for the API call to return an error
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('postConclusionError');

      // 5. Click the "Post" button
      cy.get(formId).contains('button', 'Post').click();

      // 6. Assert that the API call was made
      cy.wait('@postConclusionError');

      // 7. Assert that a user-friendly error message is displayed within the form
      cy.get(formId).contains('Failed to post conclusion.').should('be.visible');

      // 8. Assert that the form remains visible and its content is preserved
      cy.get(formId).should('be.visible');
      cy.get(formId).find('textarea').should('have.value', newConclusion.message);
      cy.get(formId).find('input[type="text"]').should('have.value', newConclusion.author);
    });
  });

  context('Adding Conclusion to a Nested Drill-Down Post', () => {
    it('should post a new conclusion successfully on a nested post', () => {
      const newConclusion = {
        author: 'Nested Conclusion Author',
        message: 'This is a conclusion to a nested sub-question.'
      };
      const parentPostText = 'Nested sub-question';
      const parentPostSK = '#DD#1#DD#1';

      // 1. Click the "Propose Answer/Solution/Choice" button on the nested drill-down post
      cy.contains('[data-testid="post-container"]', parentPostText).within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });

      // 2. Verify the conclusion form appears with the correct, deeper indentation
      const formId = `[id="conclusion-form-${parentPostSK}"]`;
      
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '144px'); // Depth 2 (parent) + 1 = 3 * 48px

      // 3. Fill out the form and set up the API intercept
      cy.get(formId).find('textarea').type(newConclusion.message);
      cy.get(formId).find('input[type="text"]').type(newConclusion.author);

      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSK}#CC#new-nested-guid`,
          Author: newConclusion.author,
          MessageBody: newConclusion.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postNestedConclusion');

      cy.get(formId).contains('button', 'Post').click();

      // 4. Assert the API call is made correctly
      cy.wait('@postNestedConclusion').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal(parentPostSK);
        expect(request.body.Author).to.equal(newConclusion.author);
        expect(request.body.MessageBody).to.equal(newConclusion.message);
      });

      // 5. Assert the new conclusion appears correctly under its parent
      const newConclusionSelector = `[data-testid="post-container"]:contains("${newConclusion.message}")`;
      cy.get(newConclusionSelector).should('be.visible');
      cy.get(newConclusionSelector).should('contain.text', newConclusion.author);
      cy.get(newConclusionSelector).should('have.css', 'margin-left', '144px'); // Depth 3 indentation

      // Assert form is hidden
      cy.get(formId).should('not.exist');
    });
  });

  context('Conclusion Post Persistence', () => {
    it('should persist conclusion post after page reload', () => {
      const newConclusion = {
        author: 'Persistence Test Author',
        message: 'This conclusion should persist after page reload.'
      };

      // 1. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="propose-answer-button"]').click();
      });

      // 2. Fill out and submit the conclusion form
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).find('textarea').type(newConclusion.message);
      cy.get(formId).find('input[type="text"]').type(newConclusion.author);

      // 3. Set up intercept for the API call
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#CC#persistence-test-guid',
          Author: newConclusion.author,
          MessageBody: newConclusion.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postConclusion');

      // 4. Mock the API response for the page reload to include the new conclusion
      cy.intercept('GET', '/conversations/CONVO%23123/posts', {
        statusCode: 200,
        body: [
          {
            PK: 'CONVO#123',
            SK: 'METADATA',
            Title: 'Test Conversation',
            MessageBody: 'This is a test conversation for conclusion persistence.',
            Author: 'Test Author',
            UpdatedAt: '1640995200',
            ConvoType: 'QUESTION'
          },
          {
            PK: 'CONVO#123',
            SK: '#DD#1',
            MessageBody: 'Sub-question',
            Author: 'Sub Author',
            UpdatedAt: '1640995300',
            ConvoType: 'QUESTION'
          },
          {
            PK: 'CONVO#123',
            SK: '#DD#1#DD#1',
            MessageBody: 'Nested sub-question',
            Author: 'Nested Author',
            UpdatedAt: '1640995400',
            ConvoType: 'QUESTION'
          },
          {
            PK: 'CONVO#123',
            SK: '#CC#persistence-test-guid',
            Author: newConclusion.author,
            MessageBody: newConclusion.message,
            UpdatedAt: Math.floor(Date.now() / 1000).toString(),
            ConvoType: 'QUESTION'
          }
        ]
      }).as('getConversationPostsWithConclusion');

      // 5. Submit the form
      cy.get(formId).contains('button', 'Post').click();
      cy.wait('@postConclusion');

      // 6. Verify the conclusion appears in the UI initially
      cy.contains('[data-testid="post-container"]', newConclusion.message).should('be.visible');


      // 7. Navigate away to conversations list
      cy.visit('/conversations');

      // 8. Navigate back to the conversation (should load from cache)
      cy.visit('/conversations/CONVO%23123');

      // 9. Assert conclusion post is still there (from cache)
      cy.contains('[data-testid="post-container"]', newConclusion.message).should('be.visible');
    });
  });
});