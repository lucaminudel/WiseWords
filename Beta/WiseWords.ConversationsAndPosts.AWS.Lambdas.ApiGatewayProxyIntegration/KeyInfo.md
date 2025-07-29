# API Gateway 

## HTTP API Endpoints 

These are the HTTP endpoints of this RESTful API : 

- **`GET /conversations?updatedAtYear={year}&filterByAuthor={author}`** - Retrieve all existing conversations by year with optional author filtering
- **`POST /conversations`** - Create a new conversation (Problem, Question, or Dilemma)
- **`POST /conversations/drilldown`** - Add a drill-down post (sub-problem, sub-question, or sub-dilemma)
- **`POST /conversations/comment`** - Add a comment post in flat threading structure
- **`POST /conversations/conclusion`** - Add a conclusion post (solution, answer, or choice)
- **`GET /conversations/{conversationId}/posts`** - Get all posts of a specific conversation
- **`OPTIONS /conversations`** - CORS preflight support for web clients
- **`DELETE /conversations/{conversationId}`** - Delete an entire conversation and all its posts (administrative operation)

## Examples of calls and related JSON

``` 
# Retrieve Conversations by Year (Author filter parameter is optional and mainly used for tests cleanup purposes)
GET /conversations?updatedAtYear=2025

# Create a new Conversation
POST /conversations 
{"NewGuid":"81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2025-07-03T12:00:00Z"}

# Append a DrillDown Post
POST /conversations/drilldown 
{ "NewDrillDownGuid": "389de26e-d625-4ede-9988-73dc2841f8c2", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser",  "MessageBody": "This is a drill-down post", "UtcCreationTime": "2025-07-09T10:39:03Z"}

# Append a Comment Post
POST /conversations/comment 
{"NewCommentGuid": "b869a64e-0953-41f3-b375-f100b6cfed28", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser",      
"MessageBody": "This is a comment post",  "UtcCreationTime": "2025-07-09T10:44:32Z"}

# Append a Conclusion Post
POST /conversations/conclusion 
{"NewConclusionGuid": "3f92293c-8877-4767-b373-030c98e6c3f1", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser", "MessageBody": "This is a conclusion post", "UtcCreationTime": "2025-07-09T10:48:23Z"}
    
# Retrieve Conversation's Posts
GET /conversations/CONVO%2381b481e0-c1fe-42fb-bc53-9d289aa05e84/posts 
Note the Uri encoding of the character # => %23

#Delete a whole Conversation
DELETE /conversations/CONVO%2381b481e0-c1fe-42fb-bc53-9d289aa05e84
Note the Uri encoding of the character # => %23

```

## Sort order of items returned by the API

The order of the items returned by the API and their format is a direct reflection of the items as stored in the NoSQL storage. The API are not applying any additional sorting or filtering logic at the time.

## GET /conversations

All the conversations of a given year, optionally filtered by author, are sorted by UpdatedAt.

## GET /conversations/{conversationId}/posts

### Post Id and Sort Key or SK
A post ID is in the form of #<Post type>#<Guuid> where post type can be DD (Drill down) or CM (Comment) or CC (Conclusion).

The SK field is the tree path of the post, it is formed by the concatenation of the posts id from the tree's root down to the post itself.

That means that every post's SK starts with the concatenated list of the parent posts id, from the root to the post's parent, and ends with the post id.
The number of concatenated post ids is equivalent to the post's depth level in the tree.

Here a few examples of posts' SKs and the related depth:

        "SK": "METADATA", depth 0 (this is for the root post, the post that is created when creating a new conversation)

        "SK": "#CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa", indentation 1 (SK is the post id of this post)

        "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f", depth 1 (SK is the post id of this post)

        "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6", depth 2 (at the right-most there is the post id of this post, and on the left side there is  post id of its parent)

        "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0", depth 2 (at the right-most there is the post id of this post, and on the left side there is  post id of its parent)


### Order of posts returned by the API and posts tree
All the post and sub-posts of a given conversation form a tree of posts.
All these pposts of a conversation tree are returned as a list of posts.

The posts in the list are sorted in ascending lexical order by their Sort Key or SK value.
Given the SK lexical order, the list of posts returned follows the order of a **depth-first traversal** of the tree: a post and all its sub posts are listed first before listing the remaining siblings.

There is one exception to this **Pre-order traversal** for the root of the tree, the conversation root post, because of the SK for the Conversation root post is by convention METADATA and is not empty. Therefore, because of the lexical order SK, the order among the simblings is:
- #CC# > #CM# > #DD# > METADATA (the root is the last post in the list instead of being the first)

This below is an example of the SKs of posts as returned by the API, followed by the description of the type of post and its depth:

#CC#b461ab72-eb57-4524-a823-ee7a57ed1671, Conclusion 1
#CM#7128ee33-82f7-4691-aaba-135686418a6c, Comment, 1
#CM#a95222e9-702f-4c77-8424-68a81e4a6151, Comment, 1
#CM#c6338dbf-34e6-45ba-8569-ca4131b2a71f, Comment, 1
#CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa, Comment 1
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f, Drill down, 1
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6, Conclusion, 2
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0,  Comment, 2
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#9f61030b-983f-4c3a-98fb-93cf0c9804b6,  Comment, 2
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#bb1a8399-858a-4ff7-9dc8-81ba9c173b09, Comment, 2
#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#DD#16147f0d-0b80-42ae-9c0a-f12ac15b2285, Drill down, 2
#DD#4c74fd07-371d-45f0-8ea2-42e9b3164e2d, Drill down, 1
METADATA, Conversation root, 0

- All the posts with the same depth, optionally separated by sub-posts with higher depth but not by parents with lower depth, are siblings, 
- All the sub-posts follow, immediately after their parent post
- All siblings of the same type (e.g. Comments or Drill down) are contiguous, with the exception of sub-posts that follow immediately after their parent post, and can be of different types.


### Posts tree structure

The structure of the tree is constrained by the type of sub-posts admitted for a given type.
These are the rules that define the structure of the post tree.
In particular Comments and Conclusions do not admit sub-posts.


### Referential integrity

The referential integrity of posts and sub-posts is currently implicitly ensured by
- the front-end appending new posts only to existing posts
- not physical posts deletion other than for tests cleanup.

Given this, the explicit enforcement of referencial integrity, that encures in additional costs, is not currently, is not currently implemented.
