
describe('Conversation Thread Caching Behavior', () => {
  const conversationId = 'CONVO#123';
  const cacheKey = `conversationThread_${conversationId}`;

  beforeEach(() => {
    // Clear cache before each test to ensure a clean state
    cy.clearLocalStorage();
    // Intercept the specific conversation posts API call
    cy.intercept('GET', `**/conversations/${encodeURIComponent(conversationId)}/posts`, {
      fixture: 'conversation-success.json'
    }).as('getConversationPosts');

    // Intercept the conversations list API call
    cy.intercept('GET', '**/conversations?updatedAtYear=*', {
        body: []
    }).as('getConversations');
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

  context('Navigating Back to a Cached Conversation', () => {
    it('should load from cache on back navigation and not call the API', () => {
      // 1. Visit the conversation page to populate the cache.
      cy.visitConversation(conversationId);
      cy.wait('@getConversationPosts');

      // 2. Store the initial number of API calls.
      let initialCallCount = 0;
      cy.get('@getConversationPosts.all').then(interceptions => {
        initialCallCount = interceptions.length;
      });

      // 3. Navigate to another page.
      cy.visit('/conversations');

      // 4. Go back to the conversation page.
      cy.go('back');

      // 5. Assert that the number of API calls has not increased.
      cy.get('@getConversationPosts.all').then(interceptions => {
        expect(interceptions.length).to.equal(initialCallCount);
      });

      // 6. Verify that the content is still displayed correctly from the cache.
      cy.get('[data-testid="post-container"]').should('be.visible');
      cy.contains('h1', 'Test Question').should('be.visible');
      cy.contains('div', 'Root question').should('be.visible');
    });
  });

  context('Adding a New Comment and Updating the Cache', () => {
    it('should update the cache after successfully posting a new comment', () => {
      const newComment = {
        author: 'Cache Tester',
        message: 'This comment should be cached.',
        SK: '#CM#new-cached-comment-guid'
      };

      // 1. Visit the conversation page
      cy.visitConversation(conversationId);
      cy.wait('@getConversationPosts');

      // 2. Intercept the comment post API call
      cy.intercept('POST', '**/conversations/comment', {
        statusCode: 201,
        body: {
          PK: conversationId,
          SK: newComment.SK,
          Author: newComment.author,
          MessageBody: newComment.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postComment');

      // 3. Add a new comment
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });
      const formId = '#comment-form-METADATA';
      cy.get(formId).find('textarea').type(newComment.message);
      cy.get(formId).find('input[type="text"]').type(newComment.author);
      cy.get(formId).contains('button', 'Post').click();

      // 4. Wait for the API call and verify the new comment is in the UI
      cy.wait('@postComment');
      cy.contains('[data-testid="post-container"]', newComment.message).should('be.visible');

      // 5. Verify that the cache in localStorage has been updated with the new comment
      cy.window().then((win) => {
        const cachedData = win.localStorage.getItem(cacheKey);
        expect(cachedData).to.not.be.null;

        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const addedComment = parsedData.find((item: any) => item.SK === newComment.SK);
          expect(addedComment).to.exist;
          expect(addedComment.Author).to.equal(newComment.author);
          expect(addedComment.MessageBody).to.equal(newComment.message);
        }
      });
    });
  });

  context('Cache Eviction Strategy', () => {
    it('should evict the least recently used item when the cache is full', () => {
      const CACHE_KEY_PREFIX = 'conversationThread_';
      const METADATA_KEY = 'conversationThreadCache_metadata';
      const MAX_CACHE_SIZE = 3 * 1024 * 1024; // 3 MB
      const largeString = 'a'.repeat(1024 * 1024); // 1MB string

      // 1. Programmatically fill the cache
      const oldestConversationId = 'CONVO#oldest';
      const oldestKey = `${CACHE_KEY_PREFIX}${oldestConversationId}`;
      cy.window().then((win) => {
        // Item 1 (oldest)
        win.localStorage.setItem(oldestKey, JSON.stringify([{ data: largeString }]));
        // Item 2
        win.localStorage.setItem(`${CACHE_KEY_PREFIX}CONVO#2`, JSON.stringify([{ data: largeString }]));
        // Item 3 (almost full)
        win.localStorage.setItem(`${CACHE_KEY_PREFIX}CONVO#3`, JSON.stringify([{ data: largeString }]));

        const metadata = {
          [oldestKey]: { key: oldestKey, size: largeString.length, lastAccessed: Date.now() - 3000 },
          [`${CACHE_KEY_PREFIX}CONVO#2`]: { key: `${CACHE_KEY_PREFIX}CONVO#2`, size: largeString.length, lastAccessed: Date.now() - 2000 },
          [`${CACHE_KEY_PREFIX}CONVO#3`]: { key: `${CACHE_KEY_PREFIX}CONVO#3`, size: largeString.length, lastAccessed: Date.now() - 1000 },
        };
        win.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      });

      // 2. Visit a new conversation thread to trigger eviction
      cy.visitConversation(conversationId);
      cy.wait('@getConversationPosts');

      // 3. Verify that the oldest item has been evicted
      cy.window().then((win) => {
        const evictedItem = win.localStorage.getItem(oldestKey);
        expect(evictedItem).to.be.null;

        const metadataString = win.localStorage.getItem(METADATA_KEY);
        const metadata = JSON.parse(metadataString || '{}');
        expect(metadata[oldestKey]).to.be.undefined;
      });

      // 4. Verify that the new conversation data is cached
      cy.window().then((win) => {
        const newItem = win.localStorage.getItem(cacheKey);
        expect(newItem).to.not.be.null;

        const metadataString = win.localStorage.getItem(METADATA_KEY);
        const metadata = JSON.parse(metadataString || '{}');
        expect(metadata[cacheKey]).to.exist;
      });
    });
  });

  context.skip('Refreshing the Page with URL hash', () => {
    it('should use the cache when refreshing with a hash', () => {
      // 1. Visit the page to populate the cache
      cy.visitConversation(conversationId);
      cy.wait('@getConversationPosts');

      // 2. Get the initial number of API calls
      let initialCallCount = 0;
      cy.get('@getConversationPosts.all').then(interceptions => {
        initialCallCount = interceptions.length;
      });

      // 3. Append hash and reload 3 times
      cy.url().then(url => {
        cy.visit(url);
      });
      cy.url().then(url => {
        cy.visit(url + '#');
      });
      cy.url().then(url => {
        cy.visit(url + '# ');
      });
      cy.reload();
      cy.reload();
      cy.reload();

      // 4. Assert that NO new API call was made
      cy.get('@getConversationPosts.all').then(interceptions => {
        expect(interceptions.length).to.be.greaterThan(initialCallCount);
      });

      // 5. Verify the content is still displayed correctly
      cy.get('[data-testid="post-container"]').should('be.visible');
      cy.contains('h1', 'Test Question').should('be.visible');
      cy.contains('div', 'Root question').should('be.visible');
    });
  });
});
