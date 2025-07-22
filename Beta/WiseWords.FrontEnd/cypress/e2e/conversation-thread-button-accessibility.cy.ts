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

    cy.get('[data-testid="sub-question-button"]').first().should(($btn) => {
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
    cy.get('[data-testid="sub-question-button"]').first().should('contain.text', 'Sub-question')
  })

  it('should handle button interactions correctly', () => {
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

    // Test that buttons are clickable (we're not testing the actual functionality, 
    // just that they respond to clicks without errors)
    cy.get('[data-testid="comment-button"]').first().click()
    // Could add assertions here for what should happen after click
    
    // Test keyboard accessibility
    cy.get('[data-testid="comment-button"]').first().focus().should('have.focus')
    
    // Test that multiple buttons are focusable (simplified tab testing)
    cy.get('[data-testid="comment-button"]').first().focus()
    cy.get('[data-testid="sub-question-button"]').first().should('be.visible').focus()
    cy.focused().should('have.attr', 'data-testid', 'sub-question-button')
    
    // Test Enter key activation
    cy.get('[data-testid="sub-question-button"]').first().focus().type('{enter}')
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
})