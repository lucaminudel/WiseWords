describe('Landing Page', () => {
  it('should display the landing page and navigate to the conversations list on button click', () => {
    // 1. Visit the root URL
    cy.visit('/');

    // 2. Verify key elements are visible
    cy.contains('A calm forum to facilitate productive conversations').should('be.visible');
    const enterButton = cy.contains('button', 'Enter');
    enterButton.should('be.visible');
    cy.contains('Contact us here').should('be.visible');

    // 3. Click the "Enter" button
    enterButton.click();

    // 4. Assert that the URL has changed to /conversations
    cy.url().should('include', '/conversations');

    // 5. (Optional but good practice) Assert that an element on the new page is visible
    cy.contains('h2', 'Conversations').should('be.visible');
  });
});
