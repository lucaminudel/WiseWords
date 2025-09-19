describe('ConversationThread Button Accessibility & Interactions', () => {
  beforeEach(() => {
    // Mock the API response with our test data
    cy.mockConversationAPI('success')
  })

  afterEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout-button').length > 0) {
        cy.get('#logout-button').click();
      }
    });
  });

  it('should display correct buttons for each post type regardless of nesting level', () => {
    // Visit the conversation thread
    cy.visitConversation('CONVO#123')
    
    // Wait for the API call to complete and content to load
    cy.wait('@getConversationPosts')
    cy.contains('Root question').should('be.visible')

    // Root conversation (METADATA) should have same buttons as drill-down posts
    cy.contains('Root question').closest('[data-testid="post-container"]').within(() => {
      cy.get('[data-testid="comment-button"]').should('be.visible')
      cy.get('[data-testid="drill-down-button"]').should('be.visible')
      cy.get('[data-testid="propose-answer-button"]').should('be.visible')
      cy.get('[data-testid="reply-quote-button"]').should('not.exist')
    })

    // Regular comment posts should only have "Reply with quote" button
    const commentPosts = ['Root level comment', 'Nested comment']
    commentPosts.forEach(commentText => {
      cy.contains(commentText).closest('[data-testid="post-container"]').within(() => {
        cy.get('[data-testid="reply-quote-button"]').should('be.visible')
        cy.get('[data-testid="comment-button"]').should('not.exist')
        cy.get('[data-testid="drill-down-button"]').should('not.exist')
        cy.get('[data-testid="propose-answer-button"]').should('not.exist')
      })
    })

    // Drill-down posts should have Comment, Sub-question, and Propose Answer buttons
    const drillDownPosts = ['Root level sub-question', 'Nested sub-question']
    drillDownPosts.forEach(drillDownText => {
      cy.contains(drillDownText).closest('[data-testid="post-container"]').within(() => {
        cy.get('[data-testid="comment-button"]').should('be.visible')
        cy.get('[data-testid="drill-down-button"]').should('be.visible')
        cy.get('[data-testid="propose-answer-button"]').should('be.visible')
        cy.get('[data-testid="reply-quote-button"]').should('not.exist')
      })
    })

    // Solution/conclusion posts should have no action buttons
    cy.contains('Proposed solution').closest('[data-testid="post-container"]').within(() => {
      cy.get('[data-testid="comment-button"]').should('not.exist')
      cy.get('[data-testid="drill-down-button"]').should('not.exist')
      cy.get('[data-testid="propose-answer-button"]').should('not.exist')
      cy.get('[data-testid="reply-quote-button"]').should('not.exist')
    })
  })

  it('should have properly accessible buttons with correct attributes', () => {
    // Visit the conversation thread
    cy.visitConversation('CONVO#123')
    
    // Wait for the API call to complete and content to load
    cy.wait('@getConversationPosts')
    cy.contains('Root question').should('be.visible')

    // Check that buttons are actual button elements with proper accessibility
    cy.get('#comment-button-METADATA').should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })

    cy.get('#drill-down-button-METADATA').should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })

    cy.get('#propose-answer-button-METADATA').should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })
  })

  it('should show buttons based on conversation type context', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // For QUESTION type conversation, verify button text is contextual
    cy.get('#propose-answer-button-METADATA').should('contain.text', 'Propose Answer')
    cy.get('#drill-down-button-METADATA').should('contain.text', 'Sub-question')
  })

  it('should handle button interactions correctly', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('TestAuthor');
    });

    // Test that buttons are clickable when not disabled
    cy.get('#comment-button-METADATA').click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form
    
    cy.get('#drill-down-button-METADATA').click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form

    cy.get('#propose-answer-button-METADATA').click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form
  })

  it('should have consistent button styling across all post types', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Check that all buttons have consistent styling
    cy.get('#comment-button-METADATA')
      .should('have.css', 'cursor', 'pointer')
      .and('have.css', 'border-radius', '8px')

    // Check first reply-quote button
    cy.get('[data-testid="reply-quote-button"]').first()
      .should('have.css', 'cursor', 'pointer')
      .and('have.css', 'border-radius', '8px')
  })

  it('should disable other append buttons when one is in edit mode and re-enable them after cancel/post', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Function to check if all append buttons are disabled and visually appear so
    const checkButtonsDisabled = () => {
      const buttons = [
        '#comment-button-METADATA',
        '#drill-down-button-METADATA',
        '#propose-answer-button-METADATA'
      ];
      
      buttons.forEach(selector => {
        cy.get(selector).should('be.disabled');
        // Check visual disabled state
        cy.get(selector).should('have.css', 'opacity', '0.5');
        cy.get(selector).should('have.css', 'cursor', 'not-allowed');
      });
    };

    // Function to check if all append buttons are enabled and visually appear so
    const checkButtonsEnabled = () => {
      const buttons = [
        '#comment-button-METADATA',
        '#drill-down-button-METADATA',
        '#propose-answer-button-METADATA'
      ];
      
      buttons.forEach(selector => {
        cy.get(selector).should('not.be.disabled');
        // Check visual enabled state
        cy.get(selector).should('have.css', 'opacity', '1');
        cy.get(selector).should('have.css', 'cursor', 'pointer');
      });
    };

    // Initially, all buttons should be enabled
    checkButtonsEnabled();

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('TestAuthor');
    });

    // Click the comment button to open the edit form
    cy.get('#comment-button-METADATA').click();
    cy.get('[data-testid="post-editor-textarea"]').should('be.visible'); // Check for the textarea instead of the form container

    // Other append buttons should now be disabled
    checkButtonsDisabled();

    // Click cancel button
    cy.get('[data-testid="cancel-button"]').click();
    cy.get('[data-testid^="comment-form-"]').should('not.exist');

    // All buttons should be re-enabled
    checkButtonsEnabled();

    // Click a drill-down button to open the edit form again
    cy.get('#drill-down-button-METADATA').click()
    cy.get('[data-testid^="drilldown-form-"]').should('be.visible');

    // Other append buttons should now be disabled
    checkButtonsDisabled();

    // Click cancel button for the drill-down form
    cy.get('[data-testid="cancel-button"]').click();
    cy.get('[data-testid^="drilldown-form-"]').should('not.exist');

    // All buttons should be re-enabled
    checkButtonsEnabled();

    // All buttons should be re-enabled
    checkButtonsEnabled();
  });
})
