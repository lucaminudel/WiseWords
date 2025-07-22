describe('ConversationThread Component Rendering', () => {
  it('should show loading state initially', () => {
    // Mock API with delay to see loading state
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
      statusCode: 200,
      body: [
        {
          PK: "CONVO#123",
          SK: "METADATA",
          Title: "Test Question",
          MessageBody: "What is the meaning of life?",
          Author: "Alice",
          UpdatedAt: "1690000000",
          ConvoType: "QUESTION"
        }
      ],
      delay: 1000
    }).as('getConversationPostsDelayed')

    cy.visitConversation('CONVO#123')
    
    // Should show loading state
    cy.contains('Loading conversation...').should('be.visible')
    
    // Check loading spinner styling
    cy.get('div').contains('Loading conversation...')
      .parent()
      .should('have.css', 'text-align', 'center')
      .should('have.css', 'padding', '32px')
  })

  it('should show error state when API fails', () => {
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getConversationPostsError')

    cy.visitConversation('CONVO#123')
    
    cy.contains('Error Loading Conversation').should('be.visible')
    cy.get('button').contains('Retry').should('be.visible').and('be.enabled')
    
    // Test retry functionality
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
      statusCode: 200,
      body: [
        {
          PK: "CONVO#123",
          SK: "METADATA",
          Title: "Test Question",
          MessageBody: "What is the meaning of life?",
          Author: "Alice",
          UpdatedAt: "1690000000",
          ConvoType: "QUESTION"
        }
      ]
    }).as('getConversationPostsRetry')
    
    cy.get('button').contains('Retry').click()
    cy.contains('Test Question').should('be.visible')
  })

  it('should show error message when no metadata is returned', () => {
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
      statusCode: 200,
      body: [
        {
          PK: "CONVO#123",
          SK: "#CM#1",
          MessageBody: "Great question!",
          Author: "Bob",
          UpdatedAt: "1690000100"
        }
      ]
    }).as('getConversationPostsNoMetadata')

    cy.visitConversation('CONVO#123')
    
    cy.contains('Error Loading Conversation').should('be.visible')
    cy.contains('Conversation metadata not found in response').should('be.visible')
    cy.get('button').contains('Retry').should('be.visible')
  })

  it('should display conversation with no responses correctly', () => {
    cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
      statusCode: 200,
      body: [
        {
          PK: "CONVO#123",
          SK: "METADATA",
          Title: "Test Question",
          MessageBody: "What is the meaning of life?",
          Author: "Alice",
          UpdatedAt: "1690000000",
          ConvoType: "QUESTION"
        }
      ]
    }).as('getConversationPostsEmpty')

    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPostsEmpty')
    cy.contains('Test Question').should('be.visible')
    cy.contains('What is the meaning of life?').should('be.visible')
    cy.contains('No responses yet. Be the first to respond!').should('be.visible')
  })

  it('should display conversation with responses correctly', () => {
    cy.mockConversationAPI('success')
    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPosts')
    
    // Check conversation metadata
    cy.contains('Test Question').should('be.visible')
    cy.contains('Root question').should('be.visible')
    
    // Check responses
    cy.contains('Root level comment').should('be.visible')
    cy.contains('Root level sub-question').should('be.visible')
    cy.contains('Proposed solution').should('be.visible')
  })

  it('should display correct post types', () => {
    cy.mockConversationAPI('success')
    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPosts')
    
    // Check post type labels
    cy.contains('question').should('be.visible')
    cy.contains('Sub-question').should('be.visible')
    cy.contains('Proposed Answer').should('be.visible')
    cy.contains('Comment').should('be.visible')
  })

  it('should format timestamps correctly', () => {
    cy.mockConversationAPI('success')
    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPosts')
    
    // Check if timestamps are formatted (checking for a pattern that includes date/time)
    // Unix timestamp 1690000000 should be formatted as a readable date
    cy.contains(/\d{1,2}\/\d{1,2}\/\d{4}/).should('be.visible') // Date pattern
    cy.contains(/\d{1,2}:\d{2}/).should('be.visible') // Time pattern
  })

  it('should indent nested posts correctly', () => {
    cy.mockConversationAPI('success')
    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPosts')
    
    // Check that nested posts have proper indentation
    cy.contains('Nested comment').should('be.visible')
    cy.contains('Nested comment')
      .closest('[data-testid="post-container"]')
      .should('have.attr', 'style')
      .and('include', 'margin-left: 96px') // 3 levels deep = 72px (based on actual component logic)
      
    cy.contains('Nested sub-question')
      .closest('[data-testid="post-container"]')
      .should('have.attr', 'style')
      .and('include', 'margin-left: 96px') // 3 levels deep = 72px
  })

  it('should handle router integration correctly', () => {
    // Test with different conversation ID
    cy.intercept('GET', '**/conversations/CONVO%23456/posts', {
      statusCode: 200,
      body: [
        {
          PK: "CONVO#456",
          SK: "METADATA",
          Title: "Different Question",
          MessageBody: "How does routing work?",
          Author: "Bob",
          UpdatedAt: "1690000000",
          ConvoType: "QUESTION"
        }
      ]
    }).as('getConversationPosts456')

    cy.visitConversation('CONVO#456')
    
    cy.wait('@getConversationPosts456')
    cy.contains('Different Question').should('be.visible')
    cy.contains('How does routing work?').should('be.visible')
    
    // Check URL
    cy.url().should('include', '/conversations/CONVO%23456')
  })

  it('should display proper visual hierarchy and styling', () => {
    cy.mockConversationAPI('success')
    cy.visitConversation('CONVO#123')
    
    cy.wait('@getConversationPosts')
    
    // Check main conversation styling
    cy.contains('Root question')
      .closest('[data-testid="post-container"]')
      .should('have.css', 'background-color')
      .and('not.equal', 'rgba(0, 0, 0, 0)')
      
    // Check response posts have consistent styling
    cy.get('[data-testid="post-container"]').should('have.length.at.least', 2)
    cy.get('[data-testid="post-container"]').each(($container) => {
      cy.wrap($container).should('have.css', 'border-radius', '8px')
      // Note: Main conversation has 24px padding, response posts have 16px padding
      cy.wrap($container).should('have.css', 'padding').and('match', /(16px|24px)/)
    })
  })
})