describe('Landing Page', () => {
  it('should display the landing page and navigate to the conversations list on button click', () => {
    // 1. Visit the root URL
    cy.visit('/');

    // 2. Verify key elements are visible
    cy.contains('Wise Words').should('be.visible');
    cy.contains('All social networks are good to share news, opinions and statements.').should('be.visible');
    const enterButton = cy.contains('button', 'Enter');
    enterButton.should('be.visible');

    // 3. Click the "Enter" button
    enterButton.click();

    // 4. Assert that the URL has changed to /conversations
    cy.url().should('include', '/conversations');

    // 5. (Optional but good practice) Assert that an element on the new page is visible
    cy.contains('h2', 'Conversations').should('be.visible');
  });
});
