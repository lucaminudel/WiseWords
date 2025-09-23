describe('Conversation Thread Drill Down Workflow', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
    cy.visitConversation('CONVO#123');
    cy.wait('@getConversationPosts');
  });

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  context('Drilling down on the Root Conversation Post', () => {
    it('should post a new drill down on the Conversation root post successfully', () => {
      const newDrillDown = {
        author: 'Alice',
        title: 'Sub-problem title',
        message: 'This is a brand new drill down on the root post.'
      };

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newDrillDown.author);
      });

      // 2. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // 3. Verify the drill down form appears with the correct indentation (Level 1)
      // The form is attached to the root post, which has SK 'METADATA'
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).should('be.visible');
      cy.get(formSelector).should('have.css', 'margin-left', '48px');

      // 4. Fill out the title and message fields
      cy.get(formSelector).find('input[placeholder*="Title"]').type(newDrillDown.title);
      cy.get(formSelector).find('textarea').type(newDrillDown.message);

      // 4. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#DD#new-drill-down-guid',
          Author: newDrillDown.author,
          Title: newDrillDown.title,
          MessageBody: newDrillDown.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postDrillDown');

      cy.get(formSelector).contains('button', 'Post').click();

      // 5. Assert that the API call was made with the correct parameters
      cy.wait('@postDrillDown').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal('');
        expect(request.body.Author).to.equal(newDrillDown.author);
        expect(request.body.Title).to.equal(newDrillDown.title);
        expect(request.body.MessageBody).to.equal(newDrillDown.message);
        expect(request.body.NewDrillDownGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 6. Assert that the new drill down appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newDrillDown.message).as('NewDrillDownPost');
      cy.get('@NewDrillDownPost').should('be.visible');
      cy.get('@NewDrillDownPost').should('contain.text', newDrillDown.author);
      cy.get('@NewDrillDownPost').should('contain.text', newDrillDown.title);
      cy.get('@NewDrillDownPost').should('have.css', 'margin-left', '48px'); // Level 1 indentation

      // 7. Assert that the drill down form is now hidden
      cy.get(formSelector).should('not.exist');
    });

    it('should cancel posting a new drill down', () => {
      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Alice');
      });

      // 2. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // 3. Get the form ID and verify it's visible
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).should('be.visible');

      // 4. Fill out the title and message
      cy.get(formSelector).find('input[placeholder*="Title"]').type('Cancelled drill down title');
      cy.get(formSelector).find('textarea').type('This drill down should be cancelled.');

      // 5. Click the "Cancel" button
      cy.get(formSelector).contains('button', 'Cancel').click();

      // 6. Assert that the form is now hidden
      cy.get(formSelector).should('not.exist');

      // 7. Assert that no new drill down was added to the thread
      cy.contains('[data-testid="post-container"]', 'This drill down should be cancelled.').should('not.exist');

      // 8. Re-open the form and assert that it is empty
      cy.get('#drill-down-button-METADATA').click();
      cy.get(formSelector).find('textarea').should('have.value', '');
    });

    it('should display an error message and keep form content on API error', () => {
      const newDrillDown = {
        author: 'Alice',
        message: 'This drill down should fail to post.'
      };

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newDrillDown.author);
      });

      // 2. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // 3. Get the form ID and verify it's visible
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).should('be.visible');

      // 4. Fill out the title and message
      cy.get(formSelector).find('input[placeholder*="Title"]').type('Error drill down title');
      cy.get(formSelector).find('textarea').type(newDrillDown.message);

      // 5. Set up intercept for the API call to return an error
      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('postDrillDownError');

      // 6. Click the "Post" button
      cy.get(formSelector).contains('button', 'Post').click();

      // 7. Assert that the API call was made
      cy.wait('@postDrillDownError');

      // 8. Assert that a user-friendly error message is displayed within the form
      cy.get(formSelector).contains('Failed to post drilldown.').should('be.visible');

      // 9. Assert that the form remains visible and its content is preserved
      cy.get(formSelector).should('be.visible');
      cy.get(formSelector).find('textarea').should('have.value', newDrillDown.message);
    });
  });

  context('Drilling down on a Nested Drill-Down Post', () => {
    it('should post a new drill down successfully on a nested post', () => {
      const newDrillDown = {
        author: 'Alice',
        title: 'Nested Sub-problem title',
        message: 'This is a reply to a nested sub-question.'
      };
      const parentPostText = 'Nested sub-question';
      const parentPostSK = '#DD#1#DD#1';

      // 1. Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(newDrillDown.author);
      });

      // 2. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the nested drill-down post
      cy.get(`[id="drill-down-button-${parentPostSK}"]`).click();

      // 3. Verify the drill down form appears with the correct, deeper indentation
      const formSelector = `[data-testid="drilldown-form-${parentPostSK}"]`;
      
      cy.get(formSelector).should('be.visible');
      cy.get(formSelector).should('have.css', 'margin-left', '144px'); // Depth 2 (parent) + 1 = 3 * 48px

      // 4. Fill out the title and message, then set up the API intercept
      cy.get(formSelector).find('input[placeholder*="Title"]').type(newDrillDown.title);
      cy.get(formSelector).find('textarea').type(newDrillDown.message);

      cy.intercept('POST', '/conversations/drilldown', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSK}#DD#new-nested-guid`,
          Author: newDrillDown.author,
          Title: newDrillDown.title,
          MessageBody: newDrillDown.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postNestedDrillDown');

      cy.get(formSelector).contains('button', 'Post').click();

      // 4. Assert the API call is made correctly
      cy.wait('@postNestedDrillDown').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal(parentPostSK);
        expect(request.body.Author).to.equal(newDrillDown.author);
        expect(request.body.Title).to.equal(newDrillDown.title);
        expect(request.body.MessageBody).to.equal(newDrillDown.message);
      });

      // 5. Assert the new drill down appears correctly under its parent
      const newDrillDownSelector = `[data-testid="post-container"]:contains("${newDrillDown.message}")`;
      cy.get(newDrillDownSelector).should('be.visible');
      cy.get(newDrillDownSelector).should('contain.text', newDrillDown.author);
      cy.get(newDrillDownSelector).should('contain.text', newDrillDown.title);
      cy.get(newDrillDownSelector).should('have.css', 'margin-left', '144px'); // Depth 3 indentation

      // Assert form is hidden
      cy.get(formSelector).should('not.exist');
    });
  });

  context('Form Validation', () => {
    beforeEach(() => {
      // Stub the window prompt before clicking the button
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Alice'); // Log in as owner
      });
    });

    it('should have an enabled "Post" button when the drill-down form is opened by the owner', () => {
      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // 2. Verify the drill down form appears
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).should('be.visible');

      // 3. The "Post" button should be enabled
      cy.get(formSelector).contains('button', 'Post').should('be.enabled');
    });

    it('should show an error message when trying to post a drill-down with empty fields', () => {
      // 1. Click the "Sub-question/Sub-problem:/Sub-Dilemma" button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // 2. Verify the drill down form appears
      const formSelector = '[data-testid="drilldown-form-METADATA"]';
      cy.get(formSelector).should('be.visible');

      // 3. Click the "Post" button without filling in the fields
      cy.get(formSelector).contains('button', 'Post').click();

      // 4. An error message should be displayed
      cy.get(formSelector).should('contain.text', 'Please fill in all required fields');

      // 5. The error message should have the correct styling
      cy.get(formSelector).find('div').contains('Please fill in all required fields').should('have.css', 'color', 'rgb(255, 79, 90)'); // --color-danger

      // 6. Fill in only the title and check for the error again
      cy.get(formSelector).find('input[placeholder*="Title"]').type('Incomplete Drill Down');
      cy.get(formSelector).contains('button', 'Post').click();
      cy.get(formSelector).should('contain.text', 'Please fill in all required fields');

      // 7. Clear the title, fill in only the message and check for the error again
      cy.get(formSelector).find('input[placeholder*="Title"]').clear();
      cy.get(formSelector).find('textarea').type('This is an incomplete drill down message.');
      cy.get(formSelector).contains('button', 'Post').click();
      cy.get(formSelector).should('contain.text', 'Please fill in all required fields');
    });
  });
});