/**
 * E2E test to verify Conversations List page makes correct API call with current year
 * This test ensures the updatedAtYear parameter is correctly passed to the backend
 */

describe('Conversations List - API Year Parameter Test', () => {
  const currentYear = new Date().getFullYear();

  it(`should call the conversations API with the current year (${currentYear})`, () => {
    // Mock the conversations API and capture the request
    cy.intercept('GET', `**/conversations?updatedAtYear=${currentYear}`, {
      statusCode: 200,
      body: [
        {
          PK: 'CONVO#test-conversation-1',
          SK: 'METADATA',
          Title: `Test Conversation ${currentYear}`,
          Author: 'TestUser',
          UpdatedAt: Math.floor(Date.now() / 1000).toString(), // Current timestamp
          ConvoType: 'QUESTION'
        },
        {
          PK: 'CONVO#test-conversation-2',
          SK: 'METADATA',
          Title: 'Another Test Conversation',
          Author: 'AnotherUser',
          UpdatedAt: Math.floor(Date.now() / 1000).toString(), // Current timestamp
          ConvoType: 'PROBLEM'
        }
      ]
    }).as('getConversationsCurrentYear');

    
    // Visit the conversations list page
    cy.visit('/conversations');

    // Verify the correct API call was made with current year
    cy.wait('@getConversationsCurrentYear').then((interception) => {
      // Verify the request URL contains the correct year parameter
      expect(interception.request.url).to.include(`updatedAtYear=${currentYear}`);
      
      // Verify the query parameters
      const url = new URL(interception.request.url);
      expect(url.searchParams.get('updatedAtYear')).to.equal(currentYear.toString());
      
      // Log for debugging
      cy.log(`API called with URL: ${interception.request.url}`);
      cy.log(`Year parameter: ${url.searchParams.get('updatedAtYear')}`);
      cy.log(`Expected current year: ${currentYear}`);
    });

    // Verify the conversations are displayed
    cy.contains('h2', 'Conversations').should('be.visible');
    cy.contains(`Test Conversation ${currentYear}`).should('be.visible');
    cy.contains('Another Test Conversation').should('be.visible');

  });


  it(`should use the current year ${currentYear} for API calls`, () => {
    // This test verifies that the app uses the current year for API calls
    cy.intercept('GET', '**/conversations?updatedAtYear=*', (req) => {
      // Extract the year from the URL
      const url = new URL(req.url);
      const year = url.searchParams.get('updatedAtYear');
      
      // Verify it's exactly the current year
      expect(year).to.equal(currentYear.toString());
      
      req.reply({
        statusCode: 200,
        body: [{
          PK: 'CONVO#year-test',
          SK: 'METADATA',
          Title: `Conversation for year ${year}`,
          Author: 'YearTester',
          UpdatedAt: Math.floor(Date.now() / 1000).toString(),
          ConvoType: 'QUESTION'
        }]
      });
    }).as('getConversationsAnyYear');

    cy.visit('/conversations');

    cy.wait('@getConversationsAnyYear').then((interception) => {
      const url = new URL(interception.request.url);
      const yearParam = url.searchParams.get('updatedAtYear');
      
      // Critical assertion: Must be current year
      expect(yearParam).to.equal(currentYear.toString());
      
      cy.log(`Confirmed: API called with year ${yearParam}`);
    });

    // Verify the conversation with the correct year is displayed
    cy.contains(`Conversation for year ${currentYear}`).should('be.visible');
  });

  it('should handle API errors gracefully while still using correct year parameter', () => {
    // Mock API error response
    cy.intercept('GET', `**/conversations?updatedAtYear=${currentYear}`, {
      statusCode: 500,
      body: {
        error: 'Internal Server Error',
        message: 'Database connection failed'
      }
    }).as('getConversationsError');

    cy.visit('/conversations');

    // Verify the API call was made with correct year even when it fails
    cy.wait('@getConversationsError').then((interception) => {
      const url = new URL(interception.request.url);
      expect(url.searchParams.get('updatedAtYear')).to.equal(currentYear.toString());
    });

    // Verify error handling (error message should be displayed)
    cy.contains(/error|failed|unable/i).should('be.visible');
  });
});