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
    cy.wait(500); // Give some time for the form to disappear
    cy.get('[data-testid^="drilldown-form-"]').should('not.exist');

    // All buttons should be re-enabled
    checkButtonsEnabled();

    // All buttons should be re-enabled
    checkButtonsEnabled();
  });
})