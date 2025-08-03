describe('ConversationThread Button Accessibility & Interactions', () => {
  beforeEach(() => {
    // Mock the API response with our test data
    cy.mockConversationAPI('success')
  })

  it('should have properly accessible buttons with correct attributes', () => {
    // Visit the conversation thread
    cy.visitConversation('CONVO#123')
    
    // Wait for the API call to complete and content to load
    cy.wait('@getConversationPosts')
    cy.contains('Root question').should('be.visible')

    // Check that buttons are actual button elements with proper accessibility
    cy.get('[data-testid="comment-button"]').first().should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })

    cy.get('[data-testid="drill-down-button"]').first().should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })

    cy.get('[data-testid="propose-answer-button"]').first().should(($btn) => {
      expect($btn).to.have.prop('tagName', 'BUTTON')
      expect($btn).to.have.attr('type', 'button')
      expect($btn).to.not.be.disabled
    })
  })

  it('should show buttons based on conversation type context', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // For QUESTION type conversation, verify button text is contextual
    cy.get('[data-testid="propose-answer-button"]').first().should('contain.text', 'Propose Answer')
    cy.get('[data-testid="drill-down-button"]').first().should('contain.text', 'Sub-question')
  })

  it('should handle button interactions correctly', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Test that buttons are clickable when not disabled
    cy.get('[data-testid="comment-button"]').first().click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form
    
    cy.get('[data-testid="drill-down-button"]').first().click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form

    cy.get('[data-testid="propose-answer-button"]').first().click()
    cy.get('[data-testid="cancel-button"]').click(); // Close the form
  })

  it('should have consistent button styling across all post types', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Check that all buttons have consistent styling
    cy.get('[data-testid="comment-button"]').each(($btn) => {
      cy.wrap($btn).should('have.css', 'cursor', 'pointer')
      cy.wrap($btn).should('have.css', 'border-radius', '8px')
    })

    cy.get('[data-testid="reply-quote-button"]').each(($btn) => {
      cy.wrap($btn).should('have.css', 'cursor', 'pointer')
      cy.wrap($btn).should('have.css', 'border-radius', '8px')
    })
  })

  it('should disable other append buttons when one is in edit mode and re-enable them after cancel/post', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Function to check if all append buttons are disabled and visually appear so
    const checkButtonsDisabled = () => {
      cy.get('[data-testid$="-button"]').each(($btn) => { // Selects all buttons ending with -button
        const testId = $btn.attr('data-testid');
        if (testId && (testId.includes('comment') || testId.includes('drill-down') || testId.includes('propose-answer'))) {
          cy.wrap($btn).should('be.disabled');
          // Check visual disabled state
          cy.wrap($btn).should('have.css', 'opacity', '0.5');
          cy.wrap($btn).should('have.css', 'cursor', 'not-allowed');
        }
      });
    };

    // Function to check if all append buttons are enabled and visually appear so
    const checkButtonsEnabled = () => {
      cy.get('[data-testid$="-button"]').each(($btn) => {
        const testId = $btn.attr('data-testid');
        if (testId && (testId.includes('comment') || testId.includes('drill-down') || testId.includes('propose-answer'))) {
          cy.wrap($btn).should('not.be.disabled');
          // Check visual enabled state
          cy.wrap($btn).should('have.css', 'opacity', '1');
          cy.wrap($btn).should('have.css', 'cursor', 'pointer');
        }
      });
    };

    // Initially, all buttons should be enabled
    checkButtonsEnabled();

    // Click a comment button to open the edit form
    cy.get('[data-testid="comment-button"]').first().click();
    cy.get('[data-testid="post-editor-textarea"]').should('be.visible'); // Check for the textarea instead of the form container

    // Other append buttons should now be disabled
    checkButtonsDisabled();

    // Click cancel button
    cy.get('[data-testid="cancel-button"]').click();
    cy.get('[data-testid^="comment-form-"]').should('not.exist');

    // All buttons should be re-enabled
    checkButtonsEnabled();

    // Click a drill-down button to open the edit form again
    cy.get('[data-testid="drill-down-button"]').first().click();
    cy.get('[data-testid^="drilldown-form-"]').should('be.visible');

    // Other append buttons should now be disabled
    checkButtonsDisabled();

    // Click cancel button for the drill-down form
    cy.get('[data-testid="cancel-button"]').click();
    cy.wait(500); // Give some time for the form to disappear
    cy.get('[data-testid^="drilldown-form-"]').should('not.exist');

    // All buttons should be re-enabled
    checkButtonsEnabled();

    // All buttons should be re-enabled
    checkButtonsEnabled();
  });
})