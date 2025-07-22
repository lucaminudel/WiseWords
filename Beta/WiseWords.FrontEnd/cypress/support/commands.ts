/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom commands for WiseWords application
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mock conversation API responses
       * @example cy.mockConversationAPI('success')
       */
      mockConversationAPI(scenario: 'success' | 'error' | 'empty'): Chainable<void>
      
      /**
       * Custom command to visit a conversation thread
       * @example cy.visitConversation('CONVO#123')
       */
      visitConversation(conversationId: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockConversationAPI', (scenario: 'success' | 'error' | 'empty') => {
  switch (scenario) {
    case 'success':
      cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
        fixture: 'conversation-success.json'
      }).as('getConversationPosts')
      break
    case 'error':
      cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('getConversationPosts')
      break
    case 'empty':
      cy.intercept('GET', '**/conversations/CONVO%23123/posts', {
        fixture: 'conversation-empty.json'
      }).as('getConversationPosts')
      break
  }
})

Cypress.Commands.add('visitConversation', (conversationId: string) => {
  const encodedId = encodeURIComponent(conversationId)
  cy.visit(`/conversations/${encodedId}`)
})

export {}