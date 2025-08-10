# Chats and Agent actions
- Never ever for any reason and without exception, take an action without telling me what you intend to do and without asking me permission to proceed
- Before starting a new task, exploring or analysing or reasonging on something, taking any action, changing any file, running any command or script, alway tell me in advance what do you intend to do, provide me with some details like the list of files you want to change and the changes you want to do, propose a plan and then wait for approval, modification, or cancellation.
- When you are not sure about something or you have low confidence about something, say so.

# Commands for collecting feedback in agentic mode whenever you write or change code
- When you change the applicaiton code or the tests code use the build and test commands to verify that they succeed without error or to collect the error info so thare you can fix them; when you run Cypress end to end (e2e) tests and a test fails then use the commands to inspect the HTML of the page that failed and the screeshot of the page in order to find-out what needs fixing. Read all these commands from this local file: [~/Code/WiseWords/Beta/KeyInfo.md](KeyInfo.md)

# When working on and writing test code or working on a test failure
- First present me with a description of what the test is trying to do, and also ask me if I want you to analyse the code under test to identify potential bugs
- When trying to fix a unit or e2e tests that is failing, ask me if the code under test is currently working correctly, and if the anwer is yes then: do NOT try to change the code under test to make the test pass
- When fixing some new or recently changed code that is making an pre-existing test fail, ask me if the code under test is currently working correctly, and if the answer is yes then: do NOT try to delete asserts or the test to resolve the failure.

# WiseWords.FrontEnds Web applicaton in React and TypeScript
- When working on WiseWords.FrontEnds read from this local file [~/Code/WiseWords/Beta/WiseWords.FrontEnd/KeyInfo.md](WiseWords.FrontEnd/KeyInfo.md) the following info:
 - the info about the sorting of the posts received by the API and presented in the page 
 - the buttons and related functions available on the posts of the conversation thread
- When select an element with an ID in Cypress, especially one that contains special characters like #, use an Attribute Selector like this cy.get('[id="comment-form-#DD#1#DD#1"]').should('be.visible'); 

# WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration RESTful API
- When using or working on the ApiGatewayProxyIntegration RESTful API read from this local file [~/Code/WiseWords/Beta/WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration/KeyInfo.md](WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration/KeyInfo.md) this info
 - The details of the API
 - Sort order of items returned by the API and the way the conversation tree is represented
The API then calls the Lambda functions with a payload described in this local file [~/Users/lucaminudel~/Code/WiseWords/Beta/WiseWords.ConversationsAndPosts.AWS.Lambdas/KeyInfo.md](WiseWords.ConversationsAndPosts.AWS.Lambdas/KeyInfo.md)

# When writing code and when asked to review the code, apply these design principles
- prefer Simple Design, Simplicity and KISS and YAGNI principles 
- prefer low coupling, apply DRY and SOLID principles and separation of concerns. 
- apply  Dependency Inversion Principle and inject the dependencies and configuration information in the constructor avoiding calling public static methods inside a class.  
- Apply the law of Demeter and avoid using getters and setters, instead prefer smart handlers AKA visitor pattern. 
- Prefer immutable classes where it makes sense
- prefer composition over inheritance where it is possible. 
- Make the code easy to read and understand and express the intent of the code in the code itself
-  Apply the same design principles to the tests and the test data. 
- In the tests use builders for the test data to avoid duplication and make the tests easy to read and understand. Use builders with fluent interfaces.
