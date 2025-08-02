describe('ConversationThread Button Display Rules', () => {
  beforeEach(() => {
    // Mock the API response with our test data
    cy.mockConversationAPI('success')
  })

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
    cy.visitConversation('CONVO#123')
    cy.wait('@getConversationPosts')

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

    // Test that buttons are clickable (we're not testing the actual functionality, 
    // just that they respond to clicks without errors)
    cy.get('[data-testid="comment-button"]').first().click()
    // Could add assertions here for what should happen after click
    
    // Test keyboard accessibility
    cy.get('[data-testid="comment-button"]').first().focus().should('have.focus')
  })
})