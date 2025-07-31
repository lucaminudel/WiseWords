
describe('Conversation Thread Caching Behavior', () => {
  const conversationId = 'CONVO#123';
  const cacheKey = `conversationThread_${conversationId}`;

  beforeEach(() => {
    // Clear cache before each test to ensure a clean state
    cy.clearLocalStorage();
    cy.mockConversationAPI('success');
  });

  context('Initial Load and Cache Population', () => {
    it('should fetch from API on first visit and populate the cache', () => {
      // 1. Visit the conversation page for the first time
      cy.visitConversation(conversationId);

      // 2. Assert that the API call to fetch posts is made
      cy.wait('@getConversationPosts').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
      });

      // 3. Verify that the conversation content is displayed correctly
      cy.get('[data-testid="post-container"]').should('be.visible');
      cy.contains('h1', 'Test Question').should('be.visible');
      cy.contains('div', 'Root question').should('be.visible');

      // 4. After the page loads, check localStorage to verify that the data has been cached
      cy.window().then((win) => {
        const cachedData = win.localStorage.getItem(cacheKey);
        expect(cachedData).to.not.be.null;

        // 5. (Optional) Parse the cached data and assert its integrity
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          expect(parsedData).to.be.an('array');
          expect(parsedData.length).to.be.greaterThan(0);
          const metadata = parsedData.find((item: any) => item.SK === 'METADATA');
          expect(metadata).to.exist;
          expect(metadata.PK).to.equal(conversationId);
        }
      });
    });
  });
});
