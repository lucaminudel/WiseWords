
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
      cy.get('#comment-button-METADATA').click();
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
      const CACHE_VERSION = 1;
      const largeSize = 1024 * 1024; // Simulate 1MB
      const placeholderData = JSON.stringify([{ data: 'placeholder' }]);

      // Clear any existing data first
      cy.clearLocalStorage();

      const oldestConversationId = 'CONVO#oldest';
      const oldestKey = `${CACHE_KEY_PREFIX}${oldestConversationId}`;
      
      // Set up initial cache state
      cy.window().then((win) => {
        // Store the test data
        win.localStorage.setItem(oldestKey, placeholderData);
        win.localStorage.setItem(`${CACHE_KEY_PREFIX}CONVO#2`, placeholderData);
        win.localStorage.setItem(`${CACHE_KEY_PREFIX}CONVO#3`, placeholderData);

        // Store metadata with lastAccessed times
        const now = Date.now();
        const metadata = {
          [oldestKey]: { 
            key: oldestKey, 
            size: largeSize, 
            lastAccessed: now - 3000, 
            version: CACHE_VERSION 
          },
          [`${CACHE_KEY_PREFIX}CONVO#2`]: { 
            key: `${CACHE_KEY_PREFIX}CONVO#2`, 
            size: largeSize, 
            lastAccessed: now - 2000, 
            version: CACHE_VERSION 
          },
          [`${CACHE_KEY_PREFIX}CONVO#3`]: { 
            key: `${CACHE_KEY_PREFIX}CONVO#3`, 
            size: largeSize, 
            lastAccessed: now - 1000, 
            version: CACHE_VERSION 
          },
        };
        win.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      });

      // Verify initial state
      cy.window().then((win) => {
        expect(win.localStorage.getItem(oldestKey)).to.exist;
      });

      // Visit a new conversation to trigger eviction
      cy.visitConversation(conversationId);
      
      // Wait for the API call to complete
      cy.wait('@getConversationPosts');
      
      // Add a small delay to allow cache operations to complete
      cy.wait(1000);

      cy.window().then((win) => {
        // The oldest item should be evicted
        const evictedItem = win.localStorage.getItem(oldestKey);
        expect(evictedItem).to.be.null;

        // The metadata for the oldest item should be removed
        const metadataString = win.localStorage.getItem(METADATA_KEY);
        const metadata = JSON.parse(metadataString || '{}');
        expect(metadata[oldestKey]).to.be.undefined;

        // The new item should be in the cache
        const newItem = win.localStorage.getItem(cacheKey);
        expect(newItem).to.not.be.null;

        // The new item's metadata should exist
        expect(metadata[cacheKey]).to.exist;
        expect(metadata[cacheKey].version).to.equal(CACHE_VERSION);
      });
    });
  });

  context('Cache Invalidation', () => {
    it('should invalidate cache and fetch from API when cache version is outdated', () => {
      const METADATA_KEY = 'conversationThreadCache_metadata';
      const outdatedVersion = 0;

      // 1. Manually set a cache entry with an old version number
      cy.fixture('conversation-success.json').then((staleData) => {
        cy.window().then((win) => {
          const dataString = JSON.stringify(staleData);
          win.localStorage.setItem(cacheKey, dataString);
          const metadata = {
            [cacheKey]: { 
              key: cacheKey, 
              size: dataString.length, 
              lastAccessed: Date.now(),
              lastSaved: Date.now(),
              version: outdatedVersion // Outdated version
            },
          };
          win.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
        });
      });

      // 2. Visit the page and assert that an API call is made
      cy.visitConversation(conversationId);
      cy.wait('@getConversationPosts').its('response.statusCode').should('eq', 200);

      // 3. Verify the UI shows the fresh data
      cy.contains('h1', 'Test Question').should('be.visible');

      // 4. Verify the cache in localStorage is updated with the correct version
      cy.window().then((win) => {
        const metadataString = win.localStorage.getItem(METADATA_KEY);
        const metadata = JSON.parse(metadataString || '{}');
        expect(metadata[cacheKey]).to.exist;
        expect(metadata[cacheKey].version).to.not.equal(outdatedVersion);
      });
    });
  });

  context('Background Cache Refresh Behavior', () => {
    const METADATA_KEY = 'conversationThreadCache_metadata';

    it('should show stale data immediately and refresh cache in background when expired', () => {
      const stalePost = { PK: conversationId, SK: 'METADATA', Title: 'Stale Post Title', MessageBody: 'Stale post body', ConvoType: 'QUESTION', UpdatedAt: '123' };

      // 1. Set up an expired cache
      cy.window().then((win) => {
        const expiredTimestamp = Date.now() - (20 * 60 * 1000);
        const dataString = JSON.stringify([stalePost]);
        win.localStorage.setItem(cacheKey, dataString);
        const metadata = {
          [cacheKey]: { key: cacheKey, size: dataString.length, lastAccessed: expiredTimestamp, lastSaved: expiredTimestamp, version: 1 }
        };
        win.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      });

      // 2. Visit page to trigger background refresh
      cy.visitConversation(conversationId);
      cy.contains('h1', 'Stale Post Title').should('be.visible');

      // 3. Wait for the network call to complete
      cy.wait('@getConversationPosts');

      // 4. Poll the cache until it is updated, using Cypress's retry-ability
      const getCachedMessageBody = () => {
        return cy.window().then((win) => {
          const item = win.localStorage.getItem(cacheKey);
          // Return a value that allows the assertion to retry if the item is null or not parsed yet
          if (!item) return null;
          const parsed = JSON.parse(item);
          return parsed.find(p => p.SK === 'METADATA')?.MessageBody;
        });
      };
      getCachedMessageBody().should('equal', 'Root question');

      // 5. Now that the cache is confirmed updated, test the rest
      cy.reload();
      cy.contains('h1', 'Test Question').should('be.visible');
      cy.get('@getConversationPosts.all').should('have.length', 1);
    });

    it('should handle background refresh failures gracefully', () => {
      const stalePost = { PK: conversationId, SK: 'METADATA', Title: 'Stale Post Title', MessageBody: 'Stale post body', ConvoType: 'QUESTION', UpdatedAt: '123' };

      // 1. Set up expired cache
      cy.window().then((win) => {
        const expiredTimestamp = Date.now() - (20 * 60 * 1000);
        const dataString = JSON.stringify([stalePost]);
        win.localStorage.setItem(cacheKey, dataString);
        const metadata = {
          [cacheKey]: { key: cacheKey, size: dataString.length, lastAccessed: expiredTimestamp, lastSaved: expiredTimestamp, version: 1 }
        };
        win.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      });

      // 2. Intercept and make background refresh fail
      cy.intercept('GET', `**/conversations/${encodeURIComponent(conversationId)}/posts`, { 
        statusCode: 500, 
        body: { error: 'Server error' }
      }).as('failedRefresh');

      // 3. Visit page - should still show stale data
      cy.visitConversation(conversationId);
      cy.contains('h1', 'Stale Post Title').should('be.visible');

      // 4. Wait for failed background refresh attempt
      cy.wait('@failedRefresh');

      // 5. Verify stale data is still shown and cache wasn't corrupted
      cy.contains('h1', 'Stale Post Title').should('be.visible');
      cy.window().then((win) => {
        const cachedData = win.localStorage.getItem(cacheKey);
        const parsed = JSON.parse(cachedData);
        expect(parsed[0].Title).to.equal('Stale Post Title');
      });
    });
  });

});
