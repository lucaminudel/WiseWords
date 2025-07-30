# Frontend 

## Presentation of posts in a conversation 

The posts in a conversation thread are better presented in an order that is slightly different from the order of the posts as received from the API.

### Primary Post order criteria among siblings

This is the desired order among siblings, in terms of types of posts:
- #CM# > #CC# > #DD# 
That is Comments, Conclusion, Drill downs.
The Conversation root post or
- METADATA 
should be the first post of the list of all posts.

Where the sibling posts received from the API have this order:
- #CC# > #CM# > #DD# 
With the Conversation root post or
- METADATA 
being the last post of the list of all posts.

This is an example of post types retrieved by the API with the SKs lexical order:
- "SK": "#CC#b461ab72-eb57-4524-a823-ee7a57ed1671",
- "SK": "#CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#DD#16147f0d-0b80-42ae-9c0a-f12ac15b2285",
- "SK": "METADATA"

And this is how those types are presented by the frontend:
- "SK": "METADATA",
- "SK": "#CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#DD#16147f0d-0b80-42ae-9c0a-f12ac15b2285",
- "SK": "#DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6",
- "SK": "#CC#b461ab72-eb57-4524-a823-ee7a57ed1671",

### Secondary Post order criteria among siblings

Among the sibling posts of the same type, they should be further ordered by ascending order by UpdatedAt (older posts first).
This means that
- #CC# siblings are in ascending order by UpdateAt
- #CM# siblings are in ascending order by UpdateAt
- #DD# siblings are in ascending order by UpdateAt

This is an example of a conversaton tree retrieved by the API in the form or a list of posts (for each you see Post type, depth, SK, Message body, UpdatedAt):

- Proposed Solution, 1, #CC#b461ab72-eb57-4524-a823-ee7a57ed1671, Proposed Solution 5, 09/07/2025, 11:48:23
- Comment , 1,  #CM#7128ee33-82f7-4691-aaba-135686418a6c, Comment 1, 28/07/2025, 16:14:20  
- Comment , 1,  #CM#a95222e9-702f-4c77-8424-68a81e4a6151, Comment 2, 28/07/2025, 12:15:17
- Comment , 1,  #CM#c6338dbf-34e6-45ba-8569-ca4131b2a71f, Comment 3, 28/07/2025, 13:05:37
- Comment , 1,  #CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa, Comment 4,  09/07/2025, 11:44:32
- Sub-problem, 1,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f, Sub-problem 6, 10/07/2025, 11:39:03
- Proposed Solution, 2, #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6, Proposed Solution 6.4, 10/07/2025, 11:48:23
- Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0,  Comment 6.1, 10/07/2025, 11:44:32
- Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#9f61030b-983f-4c3a-98fb-93cf0c9804b6,  Comment 6.2, 28/07/2025, 16:15:03
- Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#bb1a8399-858a-4ff7-9dc8-81ba9c173b09, Comment 6.3, 28/07/2025, 13:30:46
- Sub-problem, 2, #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#DD#16147f0d-0b80-42ae-9c0a-f12ac15b2285, Sub-problem 7, 09/07/2025, 11:39:03
- Sub-problem, 1,  #DD#4c74fd07-371d-45f0-8ea2-42e9b3164e2d, Sub-problem 8, 08/07/2025, 11:39:03
- METADATA, 0, Conversation root, Data 03/07/2025, 13:00:00

And this is the order of posts as presented by the UI after additonal sorting applied to the data from the API:

METADATA, 0, Conversation root, Data 03/07/2025, 13:00:00

Comment , 1,  #CM#e27978ef-f6e7-4807-85c0-f7a04001b4aa, Comment 4, 09/07/2025, 11:44:32

Comment , 1,  #CM#a95222e9-702f-4c77-8424-68a81e4a6151, Comment 2, 28/07/2025, 12:15:17

Comment , 1,  #CM#c6338dbf-34e6-45ba-8569-ca4131b2a71f, Comment 3, 28/07/2025, 13:05:37

Comment , 1,  #CM#7128ee33-82f7-4691-aaba-135686418a6c, Comment 1, 28/07/2025, 16:14:20  

Proposed Solution, 1, #CC#b461ab72-eb57-4524-a823-ee7a57ed1671, Proposed Solution 5, 09/07/2025, 11:48:23

Sub-problem, 1, #DD#4c74fd07-371d-45f0-8ea2-42e9b3164e2d, Sub-problem 8, 08/07/2025, 11:39:03

Sub-problem, 1, #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f, Sub-problem 6, 10/07/2025, 11:39:03

Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#7309458b-af5c-4aa7-9245-f5ccc372d0f0, Comment 6.1, 10/07/2025, 11:44:32

Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#bb1a8399-858a-4ff7-9dc8-81ba9c173b09, Comment 6.3, 28/07/2025, 13:30:46

Comment , 2,  #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CM#9f61030b-983f-4c3a-98fb-93cf0c9804b6, Comment 6.2, 28/07/2025, 16:15:03

Proposed Solution, 2, #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#CC#7cd46f4d-2814-44a9-bf49-b5734d02bbb6, Proposed Solution 6.4, 10/07/2025, 11:48:23

Sub-problem, 2, #DD#3763e846-f0a8-470a-87f2-dfa3b7e3487f#DD#16147f0d-0b80-42ae-9c0a-f12ac15b2285, Sub-problem 7, 09/07/2025, 11:39:03



## Posting in a conversation

This is what the user should be allowed to do on each type of post of a conversation thread:

On a root conversation post, the user should be able to:
- Append a Comment
- Add a Drill down post (a Sub-problem or Sub-question or Sub-dilemma, based on the type of the conversation)
- Suggest a Conclusion (a solution, answer or choise, based on the type of the conversation)
- Collapse all comments (directly following the conversation root post, not implemented)

On a Comment post, the user should be able to:
- Reply with quote

On a Drill down post (a Sub-problem or Sub-question or Sub-dilemma, based on the type of the conversation), the user should be able to:
- Append a Comment
- Add a Drill down post (a Sub-problem or Sub-question or Sub-dilemma, based on the type of the conversation)
- Suggest a Conclusion (a solution, answer or choice, based on the type of the conversation)
- Collapse all the child posts (not implemented)

On a Conclusion post (a Sub-problem or Sub-question or Sub-dilemma, based on the type of the conversation), the user should be able to:
- Nothing

