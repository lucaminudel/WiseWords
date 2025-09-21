describe('Conversation Thread Conclusion Workflow', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
    cy.visitConversation('123');
    cy.wait('@getConversationPosts');
  });

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  context('Adding Conclusion to the Root Conversation Post', () => {
    it('should post a new conclusion on the Conversation root post successfully', () => {
      const newConclusion = {
        author: 'Test Author',
        title: 'Conclusion title',
        message: 'This is a brand new conclusion on the root post.'
      };

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newConclusion.author);
      });

      // 2. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();

      // 3. Verify the conclusion form appears with the correct indentation (Level 1)
      // The form is attached to the root post, which has SK 'METADATA'
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '48px');

      // 4. Fill out the title and message fields
      cy.get(formId).find('input[placeholder*="Title"]').type(newConclusion.title);
      cy.get(formId).find('textarea').type(newConclusion.message);

      // 4. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#CC#new-conclusion-guid',
          Author: newConclusion.author,
          Title: newConclusion.title,
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
        expect(request.body.Title).to.equal(newConclusion.title);
        expect(request.body.MessageBody).to.equal(newConclusion.message);
        expect(request.body.NewConclusionGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 6. Assert that the new conclusion appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newConclusion.message).as('NewConclusionPost');
      cy.get('@NewConclusionPost').should('be.visible');
      cy.get('@NewConclusionPost').should('contain.text', newConclusion.author);
      cy.get('@NewConclusionPost').should('contain.text', newConclusion.message);
      cy.get('@NewConclusionPost').should('have.css', 'margin-left', '48px'); // Level 1 indentation
      
      // Assert the title is displayed correctly within the new conclusion post
      cy.get('@NewConclusionPost').within(() => {
        cy.get('[data-testid^="post-title-"]').should('contain.text', newConclusion.title);
      });

      // 7. Assert that the conclusion form is now hidden
      cy.get(formId).should('not.exist');
    });

    it('should cancel posting a new conclusion', () => {
      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('A. User');
      });

      // 2. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();

      // 3. Get the form ID and verify it's visible
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');

      // 4. Fill out the form
      cy.get(formId).find('input[placeholder*="Title"]').type('Cancelled conclusion title');
      cy.get(formId).find('textarea').type('This conclusion should be cancelled.');

      // 5. Click the "Cancel" button
      cy.get(formId).contains('button', 'Cancel').click();

      // 6. Assert that the form is now hidden
      cy.get(formId).should('not.exist');

      // 7. Assert that no new conclusion was added to the thread
      cy.contains('[data-testid="post-container"]', 'This conclusion should be cancelled.').should('not.exist');

      // 8. Re-open the form and assert that it is empty
      cy.get('#propose-answer-button-METADATA').click();
      cy.get(formId).find('textarea').should('have.value', '');
    });

    it('should display an error message and keep form content on API error', () => {
      const newConclusion = {
        author: 'Error Author',
        message: 'This conclusion should fail to post.'
      };

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newConclusion.author);
      });

      // 2. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();

      // 3. Get the form ID and verify it's visible
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');

      // 4. Fill out the form
     cy.get(formId).find('input[placeholder*="Title"]').type('Error conclusion title');
      cy.get(formId).find('textarea').type(newConclusion.message);

      // 5. Set up intercept for the API call to return an error
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('postConclusionError');

      // 6. Click the "Post" button
      cy.get(formId).contains('button', 'Post').click();

      // 7. Assert that the API call was made
      cy.wait('@postConclusionError');

      // 8. Assert that a user-friendly error message is displayed within the form
      cy.get(formId).contains('Failed to post conclusion.').should('be.visible');

      // 9. Assert that the form remains visible and its content is preserved
      cy.get(formId).should('be.visible');
      cy.get(formId).find('textarea').should('have.value', newConclusion.message);
    });
  });

  context('Adding Conclusion to a Nested Drill-Down Post', () => {
    it('should post a new conclusion successfully on a nested post', () => {
      const newConclusion = {
        author: 'Nested Conclusion Author',
        title: 'Nested conclusion title',
        message: 'This is a conclusion to a nested sub-question.'
      };
      const parentPostText = 'Nested sub-question';
      const parentPostSK = '#DD#1#DD#1';

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newConclusion.author);
      });

      // 2. Click the "Propose Answer/Solution/Choice" button on the nested drill-down post
      cy.get(`[id="propose-answer-button-${parentPostSK}"]`).click();

      // 3. Verify the conclusion form appears with the correct, deeper indentation
      const formId = `[id="conclusion-form-${parentPostSK}"]`;
      
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '144px'); // Depth 2 (parent) + 1 = 3 * 48px

      // 4. Fill out the form and set up the API intercept
      cy.get(formId).find('input[placeholder*="Title"]').type(newConclusion.title);
      cy.get(formId).find('textarea').type(newConclusion.message);

      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSK}#CC#new-nested-guid`,
          Author: newConclusion.author,
          Title: newConclusion.title,
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
        expect(request.body.Title).to.equal(newConclusion.title);
        expect(request.body.MessageBody).to.equal(newConclusion.message);
      });

      // 5. Assert the new conclusion appears correctly under its parent
      const newConclusionSelector = `[data-testid="post-container"]:contains("${newConclusion.message}")`;
      cy.get(newConclusionSelector).should('be.visible');
      cy.get(newConclusionSelector).should('contain.text', newConclusion.author);
      cy.get(newConclusionSelector).should('contain.text', newConclusion.message);
      cy.get(newConclusionSelector).should('have.css', 'margin-left', '144px'); // Depth 3 indentation
      
      // Assert the title is displayed correctly within the new conclusion post
      cy.get(newConclusionSelector).within(() => {
        cy.get('[data-testid^="post-title-"]').should('contain.text', newConclusion.title);
      });

      // Assert form is hidden
      cy.get(formId).should('not.exist');
    });
  });

  context('Conclusion Post Persistence', () => {
    it('should persist conclusion post after page reload', () => {
      const newConclusion = {
        author: 'Persistence Test Author',
        title: 'Persistence conclusion title',
        message: 'This conclusion should persist after page reload.'
      };

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newConclusion.author);
      });

      // 2. Click the "Propose Answer/Solution/Choice" button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();

      // 3. Fill out and submit the conclusion form
      const formId = '#conclusion-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).find('input[placeholder*="Title"]').type(newConclusion.title);
      cy.get(formId).find('textarea').type(newConclusion.message);

      // 3. Set up intercept for the API call
      cy.intercept('POST', '/conversations/conclusion', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#CC#persistence-test-guid',
          Title: 'Persistence conclusion title',
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
            Title: 'Sub-question title',
            MessageBody: 'Sub-question',
            Author: 'Sub Author',
            UpdatedAt: '1640995300',
            ConvoType: 'QUESTION'
          },
          {
            PK: 'CONVO#123',
            SK: '#DD#1#DD#1',
            Title: 'Nested sub-question title',
            MessageBody: 'Nested sub-question',
            Author: 'Nested Author',
            UpdatedAt: '1640995400',
            ConvoType: 'QUESTION'
          },
          {
            PK: 'CONVO#123',
            SK: '#CC#persistence-test-guid',
            Title: 'Persistence conclusion title',
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