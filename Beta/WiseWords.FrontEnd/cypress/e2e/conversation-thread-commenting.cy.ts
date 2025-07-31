describe('Conversation Thread Commenting Workflow', () => {
  beforeEach(() => {
    // Mock the initial API response to load the conversation thread
    cy.mockConversationAPI('success');
    cy.visitConversation('CONVO#123');
    cy.wait('@getConversationPosts');
  });

  context('Replying to the Root Conversation Post', () => {
    it('should post a new comment successfully', () => {
      const newComment = {
        author: 'Test Author',
        message: 'This is a brand new comment on the root post.'
      };

      // 1. Click the "Comment" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });

      // 2. Verify the comment form appears with the correct indentation (Level 1)
      // The form is attached to the root post, which has SK 'METADATA'
      const formId = '#comment-form-METADATA';
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '48px');

      // 3. Fill out the author and message fields
      cy.get(formId).find('textarea').type(newComment.message);
      cy.get(formId).find('input[type="text"]').type(newComment.author);

      // 4. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/comment', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: '#CM#new-comment-guid',
          Author: newComment.author,
          MessageBody: newComment.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postComment');

      cy.get(formId).contains('button', 'Post').click();

      // 5. Assert that the API call was made with the correct parameters
      cy.wait('@postComment').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal('');
        expect(request.body.Author).to.equal(newComment.author);
        expect(request.body.MessageBody).to.equal(newComment.message);
        expect(request.body.NewCommentGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 6. Assert that the new comment appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newComment.message).as('NewCommentPost');
      cy.get('@NewCommentPost').should('be.visible');
      cy.get('@NewCommentPost').should('contain.text', newComment.author);
      cy.get('@NewCommentPost').should('have.css', 'margin-left', '48px'); // Level 1 indentation

      // 7. Assert that the comment form is now hidden
      cy.get(formId).should('not.exist');
    });

    it('should cancel posting a new comment', () => {
      // 1. Click the "Comment" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#comment-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type('This comment should be cancelled.');
      cy.get(formId).find('input[type="text"]').type('A. User');

      // 4. Click the "Cancel" button
      cy.get(formId).contains('button', 'Cancel').click();

      // 5. Assert that the form is now hidden
      cy.get(formId).should('not.exist');

      // 6. Assert that no new comment was added to the thread
      cy.contains('[data-testid="post-container"]', 'This comment should be cancelled.').should('not.exist');

      // 7. Re-open the form and assert that it is empty
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });
      cy.get(formId).find('textarea').should('have.value', '');
      cy.get(formId).find('input[type="text"]').should('have.value', '');
    });

    it('should display an error message and keep form content on API error', () => {
      const newComment = {
        author: 'Error Author',
        message: 'This comment should fail to post.'
      };

      // 1. Click the "Comment" button on the main conversation post
      cy.get('[data-testid="post-container"]').first().within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });

      // 2. Get the form ID and verify it's visible
      const formId = '#comment-form-METADATA';
      cy.get(formId).should('be.visible');

      // 3. Fill out the form
      cy.get(formId).find('textarea').type(newComment.message);
      cy.get(formId).find('input[type="text"]').type(newComment.author);

      // 4. Set up intercept for the API call to return an error
      cy.intercept('POST', '/conversations/comment', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('postCommentError');

      // 5. Click the "Post" button
      cy.get(formId).contains('button', 'Post').click();

      // 6. Assert that the API call was made
      cy.wait('@postCommentError');

      // 7. Assert that a user-friendly error message is displayed within the form
      cy.get(formId).contains('Failed to post comment.').should('be.visible');

      // 8. Assert that the form remains visible and its content is preserved
      cy.get(formId).should('be.visible');
      cy.get(formId).find('textarea').should('have.value', newComment.message);
      cy.get(formId).find('input[type="text"]').should('have.value', newComment.author);
    });
  });

  context('Replying to a Nested Drill-Down Post', () => {
    it('should post a new comment successfully on a nested post', () => {
      const newComment = {
        author: 'Nested Reply Author',
        message: 'This is a reply to a nested sub-question.'
      };
      const parentPostText = 'Nested sub-question';
      const parentPostSK = '#DD#1#DD#1';

      // 1. Click the "Comment" button on the nested drill-down post
      cy.contains('[data-testid="post-container"]', parentPostText).within(() => {
        cy.get('[data-testid="comment-button"]').click();
      });

      // 2. Verify the comment form appears with the correct, deeper indentation
      const formId = `[id="comment-form-${parentPostSK}"]`;
      
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '144px'); // Depth 2 (parent) + 1 = 3 * 48px

      // 3. Fill out the form and set up the API intercept
      cy.get(formId).find('textarea').type(newComment.message);
      cy.get(formId).find('input[type="text"]').type(newComment.author);

      cy.intercept('POST', '/conversations/comment', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSK}#CM#new-nested-guid`,
          Author: newComment.author,
          MessageBody: newComment.message,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postNestedComment');

      cy.get(formId).contains('button', 'Post').click();

      // 4. Assert the API call is made correctly
      cy.wait('@postNestedComment').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal(parentPostSK);
        expect(request.body.Author).to.equal(newComment.author);
        expect(request.body.MessageBody).to.equal(newComment.message);
      });

      // 5. Assert the new comment appears correctly under its parent
      const newCommentSelector = `[data-testid="post-container"]:contains("${newComment.message}")`;
      cy.get(newCommentSelector).should('be.visible');
      cy.get(newCommentSelector).should('contain.text', newComment.author);
      cy.get(newCommentSelector).should('have.css', 'margin-left', '144px'); // Depth 3 indentation

      // Assert form is hidden
      cy.get(formId).should('not.exist');
    });
  });

  context('Replying to a Comment with Quote', () => {
    it('should post a new comment with quoted text successfully', () => {
      const originalCommentText = 'Nested comment';
      const originalCommentAuthor = 'David';
      const originalCommentSK = '#DD#1#CM#1'; // Assuming this SK for 'Nested comment' from mock data
      const originalCommentMessageBody = 'Nested comment'; // Assuming this message body
      const parentPostSKForReply = '#DD#1'; // Parent of originalCommentSK
      const newReplyMessage = 'My reply to the nested comment.';
      const newReplyAuthor = 'Reply User';

      // 1. Click the "Reply with quote" button on a nested comment
      cy.contains('[data-testid="post-container"]', originalCommentText).within(() => {
        cy.get('[data-testid="reply-quote-button"]').click();
      });

      // 2. Verify the comment form appears with the correct indentation (same as original comment)
      const formId = `[id="comment-form-${originalCommentSK}"]`;
      cy.get(formId).should('be.visible');
      cy.get(formId).should('have.css', 'margin-left', '96px'); // Depth 2 (original comment) = 2 * 48px

      // 3. Assert that the textarea is pre-filled with the correctly formatted quoted text
      const expectedQuotedText = `> Original post by ${originalCommentAuthor}:\n> ${originalCommentMessageBody.replace(/\n/g, '\n> ')}\n\n`;
      cy.get(formId).find('textarea').should('have.value', expectedQuotedText);

      // 4. Add a new message below the quote and fill out the author field
      cy.get(formId).find('textarea').type(newReplyMessage);
      cy.get(formId).find('input[type="text"]').type(newReplyAuthor);

      // 5. Set up intercept for the API call and click "Post"
      cy.intercept('POST', '/conversations/comment', {
        statusCode: 201,
        body: {
          PK: 'CONVO#123',
          SK: `${parentPostSKForReply}#CM#new-reply-guid`,
          Author: newReplyAuthor,
          MessageBody: expectedQuotedText + newReplyMessage,
          UpdatedAt: Math.floor(Date.now() / 1000).toString()
        }
      }).as('postQuotedComment');

      cy.get(formId).contains('button', 'Post').click();

      // 6. Assert the API call is made correctly
      cy.wait('@postQuotedComment').then(({ request }) => {
        expect(request.body.ConversationPK).to.equal('CONVO#123');
        expect(request.body.ParentPostSK).to.equal(parentPostSKForReply);
        expect(request.body.Author).to.equal(newReplyAuthor);
        expect(request.body.MessageBody).to.equal(expectedQuotedText + newReplyMessage);
        expect(request.body.NewCommentGuid).to.be.a('string');
        expect(request.body.UtcCreationTime).to.be.a('string');
      });

      // 7. Assert the new comment appears correctly in the UI
      cy.contains('[data-testid="post-container"]', newReplyMessage).as('NewReplyPost');
      cy.get('@NewReplyPost').should('be.visible');
      cy.get('@NewReplyPost').should('contain.text', newReplyAuthor);
      cy.get('@NewReplyPost').should('contain.text', originalCommentMessageBody); // Check for quoted text
      cy.get('@NewReplyPost').should('have.css', 'margin-left', '96px'); // Same depth as original comment

      // 8. Assert that the comment form is now hidden
      cy.get(formId).should('not.exist');
    });
  });
});
