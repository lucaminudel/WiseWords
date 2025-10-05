describe('Conversation Thread Ownership Restrictions', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
  });

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  context('Non-owner user restrictions', () => {
    beforeEach(() => {
      cy.visitConversation('CONVO#123');
      cy.wait('@getConversationPosts');
      
      // Pre-authenticate as non-owner by triggering login flow
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Bob'); // Different from "Alice" who created the conversation
      });
      
      // Trigger authentication by clicking a button that requires login
      cy.get('#comment-button-METADATA').click();
      cy.get('[data-testid="comment-form-METADATA"]').should('be.visible');
      cy.get('[data-testid="comment-form-METADATA"]').find('button').contains('Cancel').click();
    });

    it('should show info message and disable form when non-owner tries to add drill-down post on root conversation', () => {
      // Click drill-down button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();

      // Verify the form is visible
      cy.get('[data-testid="drilldown-form-METADATA"]').should('be.visible');

      // Verify info message appears within the form
              cy.get('[data-testid="drilldown-form-METADATA"]').within(() => {
                cy.get('[data-testid="ownership-info-message"]').should('be.visible');
                cy.get('[data-testid="ownership-info-message"]').should('contain.text', 'Only Alice who started this conversation can do this.');
        // Verify input fields and post button are disabled
        cy.get('input[placeholder*="Title"]').should('be.disabled');
        cy.get('textarea').should('be.disabled');
        cy.get('button').contains('Post').should('be.disabled');

        // Verify cancel button is enabled
        cy.get('button').contains('Cancel').should('be.enabled');
      });
    });

    it('should show info message and disable form when non-owner tries to add conclusion post on root conversation', () => {
      // Click conclusion button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();

      // Verify the form is visible
      cy.get('[data-testid="conclusion-form-METADATA"]').should('be.visible');

      // Verify info message appears within the form
      cy.get('[data-testid="conclusion-form-METADATA"]').within(() => {
        cy.get('[data-testid="ownership-info-message"]').should('be.visible');
        cy.get('[data-testid="ownership-info-message"]').should('contain.text', 'Only Alice who started this conversation can do this.');

        // Verify input fields and post button are disabled
        cy.get('input[placeholder*="Title"]').should('be.disabled');
        cy.get('textarea').should('be.disabled');
        cy.get('button').contains('Post').should('be.disabled');

        // Verify cancel button is enabled
        cy.get('button').contains('Cancel').should('be.enabled');
      });
    });

    it('should show info message and disable form when non-owner tries to add drill-down post on nested drill-down post', () => {
      const parentPostSK = '#DD#1';
      
      // Click drill-down button on a nested drill-down post (use attribute selector for special characters)
      cy.get(`[id="drill-down-button-${parentPostSK}"]`).click();
      
      // Verify the form is visible
      cy.get(`[data-testid="drilldown-form-${parentPostSK}"]`).should('be.visible');

      // Verify info message appears within the form
      cy.get(`[data-testid="drilldown-form-${parentPostSK}"]`).within(() => {
        cy.get('[data-testid="ownership-info-message"]').should('be.visible');
        cy.get('[data-testid="ownership-info-message"]').should('contain.text', 'Only Alice who started this conversation can do this.');

        // Verify input fields and post button are disabled
        cy.get('input[placeholder*="Title"]').should('be.disabled');
        cy.get('textarea').should('be.disabled');
        cy.get('button').contains('Post').should('be.disabled');

        // Verify cancel button is enabled
        cy.get('button').contains('Cancel').should('be.enabled');
      });
    });

    it('should show info message and disable form when non-owner tries to add conclusion post on nested drill-down post', () => {
      const parentPostSK = '#DD#1';
      
      // Click conclusion button on a nested drill-down post (use attribute selector for special characters)
      cy.get(`[id="propose-answer-button-${parentPostSK}"]`).click();
      
      // Verify the form is visible
      cy.get(`[data-testid="conclusion-form-${parentPostSK}"]`).should('be.visible');

      // Verify info message appears within the form
      cy.get(`[data-testid="conclusion-form-${parentPostSK}"]`).within(() => {
        cy.get('[data-testid="ownership-info-message"]').should('be.visible');
        cy.get('[data-testid="ownership-info-message"]').should('contain.text', 'Only Alice who started this conversation can do this.');

        // Verify input fields and post button are disabled
        cy.get('input[placeholder*="Title"]').should('be.disabled');
        cy.get('textarea').should('be.disabled');
        cy.get('button').contains('Post').should('be.disabled');

        // Verify cancel button is enabled
        cy.get('button').contains('Cancel').should('be.enabled');
      });
    });

    it('should allow non-owner to post comments (no restriction)', () => {
      // Click comment button on the main conversation post
      cy.get('#comment-button-METADATA').click();
      
      // Verify NO info message appears
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      
      // Verify comment form DOES appear (comments are allowed for everyone)
      cy.get('[data-testid="comment-form-METADATA"]').should('be.visible');
      
      // Cancel the form for cleanup
      cy.get('[data-testid="comment-form-METADATA"]').find('button').contains('Cancel').click();
    });

    it('should allow non-owner to reply with quote to comments (no restriction)', () => {
      const commentPostSK = '#CM#1';
      
      // Click reply with quote button on a comment (use attribute selector for special characters)
      cy.get(`[id="reply-quote-button-${commentPostSK}"]`).click();
      
      // Verify NO info message appears
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      
      // Verify comment form appears with quoted content
      cy.get(`[data-testid="comment-form-${commentPostSK}"]`).should('be.visible');
      cy.get(`[data-testid="comment-form-${commentPostSK}"]`).find('textarea').should('contain.value', '> Original post by Bob:');
      
      // Cancel the form for cleanup
      cy.get(`[data-testid="comment-form-${commentPostSK}"]`).find('button').contains('Cancel').click();
    });
  });

  context('Owner user permissions', () => {
    beforeEach(() => {
      cy.visitConversation('CONVO#123');
      cy.wait('@getConversationPosts');
      
      // Pre-authenticate as owner by triggering login flow
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Alice'); // Same as conversation creator
      });
      
      // Trigger authentication by clicking a button that requires login
      cy.get('#comment-button-METADATA').click();
      cy.get('[data-testid="comment-form-METADATA"]').should('be.visible');
      cy.get('[data-testid="comment-form-METADATA"]').find('button').contains('Cancel').click();
    });

    it('should allow owner to access drill-down form normally without info message', () => {
      // Click drill-down button on the main conversation post
      cy.get('#drill-down-button-METADATA').click();
      
      // Verify NO info message appears
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      
      // Verify drill-down form appears normally
      cy.get('[data-testid="drilldown-form-METADATA"]').should('be.visible');
      
      // Cancel the form for cleanup
      cy.get('[data-testid="drilldown-form-METADATA"]').find('button').contains('Cancel').click();
    });

    it('should allow owner to access conclusion form normally without info message', () => {
      // Click conclusion button on the main conversation post
      cy.get('#propose-answer-button-METADATA').click();
      
      // Verify NO info message appears
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      
      // Verify conclusion form appears normally
      cy.get('[data-testid="conclusion-form-METADATA"]').should('be.visible');
      
      // Cancel the form for cleanup
      cy.get('[data-testid="conclusion-form-METADATA"]').find('button').contains('Cancel').click();
    });

    it('should allow owner to access nested drill-down and conclusion forms normally', () => {
      const parentPostSK = '#DD#1';
      
      // Test drill-down on nested post (use attribute selector for special characters)
      cy.get(`[id="drill-down-button-${parentPostSK}"]`).click();
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      cy.get(`[data-testid="drilldown-form-${parentPostSK}"]`).should('be.visible');
      cy.get(`[data-testid="drilldown-form-${parentPostSK}"]`).find('button').contains('Cancel').click();
      
      // Test conclusion on nested post (use attribute selector for special characters)
      cy.get(`[id="propose-answer-button-${parentPostSK}"]`).click();
      cy.get('[data-testid="ownership-info-message"]').should('not.exist');
      cy.get(`[data-testid="conclusion-form-${parentPostSK}"]`).should('be.visible');
      cy.get(`[data-testid="conclusion-form-${parentPostSK}"]`).find('button').contains('Cancel').click();
    });
  });

  context('Info message behavior', () => {
    beforeEach(() => {
      cy.visitConversation('CONVO#123');
      cy.wait('@getConversationPosts');
      
      // Pre-authenticate as non-owner by triggering login flow
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Bob'); // Non-owner
      });
      
      // Trigger authentication by clicking a button that requires login
      cy.get('#comment-button-METADATA').click();
      cy.get('[data-testid="comment-form-METADATA"]').should('be.visible');
      cy.get('[data-testid="comment-form-METADATA"]').find('button').contains('Cancel').click();
    });



    it('should display info message with correct styling distinguishable from error messages', () => {
      // Click to trigger info message
      cy.get('#drill-down-button-METADATA').click();
      
      cy.get('[data-testid="drilldown-form-METADATA"]').within(() => {
        cy.get('[data-testid="ownership-info-message"]')
          .should('be.visible')
          .and('have.css', 'background-color', 'rgba(94, 139, 255, 0.1)') // transparent blue
          .and('have.css', 'color', 'rgb(94, 139, 255)') // blue text
          .and('have.css', 'border', '1px solid rgb(94, 139, 255)') // blue border
          .and('not.contain.text', 'Action Restricted');
      });
    });
  });
});