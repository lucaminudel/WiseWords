# Shell commands

## Commands for the AI-assistent to generate feedback

Bild WiseWords.FrontEnd, and spot build errors
```bash
npm: build
```

Run WiseWords.FrontEnd unit tests, and find test failures
```bash
npm: test
```

Run WiseWords.FrontEnd e2e tests, and find e2e tests failures
```bash
npm: e2etest
```
With screenshots of the failed e2e tests to be found here: WiseWords.FrontEnd/cypress/screenshots
With htlm of the failed e2e tests to be found here: WiseWords.FrontEnd/cypress/failed
When needed to get a snapshot of the html just before an assert fails (as it could change while waiting for the assertion to pass or fail), this code can be added before the failing assertion
```TypeScript
// Example on how to save the page html before the assertion failure 
// in case that the html changes while waiting for the assertion to pass or fail
       cy.get('html').then(($html) => {
        const htmlBeforeAssertion = $html.html(); 
        cy.savePage('cypress/failed/pages/<title>>');
      });
```

Build and run WiseWords.FrontEnd unit and e2e tests, to do all the above until the first error
```bash
npm: build_test
```

## Commands for the developer to run the system in the local development environment

This is the command line to run and test the *AWS Lambda .NET Mock Lambda Test Tool* to test locally Lambda functions, from the WiseWords.ConversationsAndPosts.AWS.Lambdas folder

```bash
dotnet-lambda-test-tool-8.0  
```

These are the commands to build the code and deploy it into the *AWS SAM (Serverless Application Model)* for local development and testing of AWS API Gateway routing and Lambda events:

```bash
# Build the Lambda and API Gateway code for deployment into the ./publish folder  
dotnet publish WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.csproj  -c Release -o ./publish -r linux-x64

# Run the code in the local container
sam local start-api  --template template.yaml  --debug 
```

This is the command to serve the CSR static pages of the frontend websit, from the WiseWords.Frontend folder

```bash
npm run dev
```

These are examples of curl commands to call the API via command line

```bash

# Create a new Conversation
curl -i -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d '{"NewGuid":"81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2025-07-03T12:00:00Z"}'

# Append a DrillDown Post
curl -i -X POST http://localhost:3000/conversations/drilldown \
  -H "Content-Type: application/json" \
  -d  '{ "NewDrillDownGuid": "389de26e-d625-4ede-9988-73dc2841f8c2", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser",  "MessageBody": "This is a drill-down post", "UtcCreationTime": "2025-07-09T10:39:03Z"}'

# Append a Comment Post
curl -i -X POST http://localhost:3000/conversations/comment \
  -H "Content-Type: application/json" \
  -d  '{"NewCommentGuid": "b869a64e-0953-41f3-b375-f100b6cfed28", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser",      
"MessageBody": "This is a comment post",  "UtcCreationTime": "2025-07-09T10:44:32Z"}'

# Append a Conclusion Post
curl -i -X POST http://localhost:3000/conversations/conclusion \
  -H "Content-Type: application/json" \
  -d '{"NewConclusionGuid": "3f92293c-8877-4767-b373-030c98e6c3f1", "ConversationPK": "CONVO#81b481e0-c1fe-42fb-bc53-9d289aa05e84", "ParentPostSK": "", "Author": "HttpTestUser", "MessageBody": "This is a conclusion post", "UtcCreationTime": "2025-07-09T10:48:23Z"}'

#Retrieve Conversation's Posts, requires Uri encoding of the character # as %23
curl -i -X GET http://localhost:3000/conversations/CONVO%2381b481e0-c1fe-42fb-bc53-9d289aa05e84/posts 

# Retrieve Conversations by Year
curl -i -X GET "http://localhost:3000/conversations?updatedAtYear=2025"

#Delete a whole Conversation, requires Uri encoding of the character # as %23
curl -i -X DELETE http://localhost:3000/conversations/CONVO%2381b481e0-c1fe-42fb-bc53-9d289aa05e84

```
