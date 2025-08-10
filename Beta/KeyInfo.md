# Essential Shell commands recap for the AI Agent and for the developer


## Commands for the AI-assistant to generate feedback for the Backend-end

Build DataStore from its folder whenever the related code or tests are made after any change to the DataStore code:
```bash
dotnet build WiseWords.ConversationsAndPosts.DataStore.sln
```

Run DataStore.Tests from their folder (requires the local Docker image of AWS DynamoDb to be running)  after any change to the DataStore code or DataStore.Tests tests:
```bash
dotnet test WiseWords.ConversationsAndPosts.DataStore.Tests.csproj
```

Build WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration after any changes to the ApiGatewayProxyIntegration code:
```bash
dotnet build WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.sln
```

Run API Gateway Integration Tests from their folder (requires the back-end to be running in the AWS SAM environment) after any changes to the ApiGatewayProxyIntegration code or the tests:
```bash
dotnet test WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.Tests.csproj 
```



## Commands for the AI-assistant to generate feedback for the Front-end

Build WiseWords.FrontEnd, and spot build errors after every change in WiseWords.FrontEnd code:
```bash

# VS Code Task
npm: build

# Equivalent command
npm run build 
```

Run WiseWords.FrontEnd unit tests, and find test failures after every change in WiseWords.FrontEnd code or unit tests:
```bash
# VS Code Task
npm: test

# Equivalent command
 npm test
```

Run WiseWords.FrontEnd e2e tests, and find e2e tests failures (requires the back-end to be running in the AWS SAM environment) for every change in WiseWords.FrontEnd code or e2e tests:
```bash
# VS Code Task
npm: e2etest

# Equivalent command
npm run test:e2e
```

Build and run WiseWords.FrontEnd unit and e2e tests, to do all the above until the first error.
```bash
# VS Code Task
npm: build_and_test

# Equivalent command
# All three related commands above
```



## Commands for the AI-assistant to generate feedback for the Front-end when fixing a failing e2e test

When fixing a failing e2e test or the code under test, always run the single failing e2e test, and only after it fails, run all the other tests:
```bash
# Here is an example for the test file conversation-thread-commenting.cy.ts run from the /WiseWords/Beta/WiseWords.FrontEnd folder
npm run test:e2e -- --spec "cypress/e2e/conversation-thread-commenting.cy.ts" 
```
In case of test failure, search in the output of the previous command for the following info, starting with 'cyclope: saving page for failed test':
```
cyclope: saving page for failed test
  spec <filename containing the test code>.cy.ts>
  test <text describing the test scenario>
making folder <here goes the path to the html file that made the expectation and so the test fails, you HAVE inspect this file>
cyclope: savePage took xx ms
```

After a 2e2 test fails, always inspect the HTML with which the assert failed:
```bash
# Here is an example for a failed assert: should display an error message and keep form content on API error
# in the test page: conversation-thread-commenting.cy.ts
# Fronm /WiseWords/Beta/WiseWords.FrontEnd go to 
# the folder with the 
cd ./cypress/failed/conversation-thread-commenting.cy.ts/should display an error message and keep form content on API error/

# The HTML is in the file named like the page, index.html
cat index.html
```

If the HTML changed while the assert was waiting for a timeout, add this to capture the HTML before the assert and then inspect that HTML:
```TypeScript
       // Example on how to save the page html before the assertion failure 
       // in case the html changes while waiting for the assertion to pass or fail
       cy.get('html').then(($html) => {
        const htmlBeforeAssertion = $html.html(); 
        cy.savePage('cypress/failed/pages/<title>');
      });
```

After an e2e test fails, if needed, look at the screenshot of the page the moment after the failure:
```bash
# Here is an example for a failed assert: should display an error message and keep form content on API error
# in the test page: conversation-thread-commenting.cy.ts
# Fronm /WiseWords/Beta/WiseWords.FrontEnd go to 
# the folder with the 
cd ./cypress/screenshots/conversation-thread-commenting.cy.ts 10-54-28-170.ts/

# The image is in the file named like the page, index.html
ls "Conversation Thread Commenting Workflow -- Replying to the Root Conversation Post -- should display an error message and keep form content on API error (failed).png"
```

## Commands for the developer to run the system in the local development environment 

These are the commands to build the code and deploy it into the *AWS SAM (Serverless Application Model)* for local development and testing of AWS API Gateway routing and Lambda events:

```bash
cd WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration

# Build the Lambda and API Gateway code for deployment into the ./publish folder  
dotnet publish WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.csproj  -c Release -o ./publish -r linux-x64

cd publish
zip -r ../publish.zip .
cd ../
rm -rf publish

# Run the code in the local container
sam local start-api  --template template.yaml  --debug --warm-containers LAZY 
# use EAGER instead of LAZY containers then stay running between lamba calls, not like the real cloud environment
cd ..
```

This is the command to serve the CSR static pages of the frontend website, from the WiseWords.FrontEnd folder (requires the back-end to be running in the AWS SAM environment):

```bash
cd WiseWords.FrontEnd

WISEWORDS_ENV=local_dev npm run dev
```


This is the command to build the frontend website bundle from the WiseWords.FrontEnd folder, to be deployed on S3 with the right config embedded in the static files:

```bash
cd WiseWords.FrontEnd

WISEWORDS_ENV=aws_prod npm run build
```


## Commands for the developer for manual testing in the local development environment

This is the command line to run and test the *AWS Lambda .NET Mock Lambda Test Tool* to locally test Lambda functions, from the WiseWords.ConversationsAndPosts.AWS.Lambdas folder

```bash
export WISEWORDS_ENV=local_dev
dotnet-lambda-test-tool-8.0  
```

These are examples of curl commands to call the API via the command line

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
## Memo, all AI assistants' default command files
- ~/.gemini/GEMINI.md
- ~/Code/WiseWords/Beta/.agent.md
- ~/Code/WiseWords/Beta/.github/copilot-instructions.md
- ~/.codeium/windsurf/memories/global_rules.md
