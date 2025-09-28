# IMPORTANT Instructions for AI-Agent and AI coding assistant
- Do not ignore these explicit instructions related to asking permission before acting: ALWAYS ask permission before ANY file modifications.
- Never ever, for any reason and without exception, take an action or start analysing something without first declaring the intent and asking for permission to proceed.
- When pertinent, ask clarifying questions upfront about scope boundaries to avoid Scope Creep.
- When technical decisions on how to solve a problem have multiple valid approaches and options, present the options and ask to discuss them before proceeding.
- Complete one layer fully before moving to the next, therefore following an incremental iterative approach.
- Before making any changes to the code, ask permission to analyse the current implementation first.
- Before starting a new task, exploring or analysing or reasoning on something, taking any action, changing any file, running any command or script, always provide a summary of the intended actions, provide a list of files affected and for each file, the list of changes expected, propose a plan and then ask and wait for approval.
- After a couple of failed tries to fix the code or a test, search how to generate and collect output, logs and in general feedback to diagnose the problem before jumping to a solution. See below how to collect feedback, and when you cannot do it autonomously, ask the operator to produce and collect the specific feedback required.

# Generic guidelines for AI-Agent and AI coding assistant

## When fixing a broken unit or e2e tests:
- When trying to fix a broken unit or e2e test, ask clarifying questions to understand if the problem is in the test or in the code under test. When the problem is in the test (the failure is a false positive), do NOT try to change the code under test to make the test pass.
- Do NOT delete test assertions and expectations to fix a broken test, without analysing and verifying that those assertions are indeed unnecessary, and always ask permission before deleting assertions.

## Follows these design principles
- Prefer Simple Design, Simplicity, KISS and YAGNI principles 
- Prefer low coupling, apply DRY and SOLID principles and separation of concerns. 
- Apply the  Dependency Inversion Principle and inject the dependencies and configuration information in the constructor, avoiding calling public static methods inside a class.  
- Apply the law of Demeter and avoid using getters and setters, instead prefer smart handlers, AKA the visitor pattern. 
- Prefer immutable classes where it makes sense
- Make the code easy to read and understand, and express the intent of the code in the code itself
- Prefer composition over inheritance where it is possible. 
- Apply the same design principles to the tests and the test data. 
- In the tests, use builders for the test data to avoid duplication and make the tests easy to read and understand. Use builders with fluent interfaces.

# WiseWords specific instructions for AI-Agent and AI coding assistant

## The architecture of the application
- When starting a new session, always look at these instructions in this file [~/Code/WiseWords/Beta/KeyInfo2.md](KeyInfo2.md)
- Read these instructions in this file as soon as you may need information about the application infrastructure, deployment, technology stack, local and production environment, authentication and authorisation, the main components, and the overall application design

## Essential Shell commands for the AI Agent and the developer to generate and collect feedback that helps diagnose problems or validate solutions
- When you change the applicaiton code or the tests code use the build and test commands to verify that they succeed without error or to collect the error info so thare you can fix them; when you run Cypress end to end (e2e) tests and a test fails then use the commands to inspect the HTML of the page that failed and the screeshot of the page in order to find-out what needs fixing. Read all these commands from this local file: [~/Code/WiseWords/Beta/KeyInfo.md](KeyInfo.md)
- Read the instructions in this file as soon as you make any changes to the code (add/remove/modify).

## React and TypeScript WiseWords.FrontEnds Web application important info
- When working on WiseWords.FrontEnds read from this local file [~/Code/WiseWords/Beta/WiseWords.FrontEnd/KeyInfo.md](WiseWords.FrontEnd/KeyInfo.md) the following info:
 - the info about the sorting of the posts received by the API and presented on the page 
 - the buttons and related functions available on the posts of the conversation thread
- When selecting an element with an ID in Cypress, that contains special characters like #, use the Attribute Selector with ' and " like this string format: cy.get('[id="comment-form-#DD#1#DD#1"]')...

## RESTful API WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway important info
- When using or working on the ApiGateway RESTful API read from this local file [~/Code/WiseWords/Beta/WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/KeyInfo.md](WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/KeyInfo.md) this info
 - Read about the API
 - Read about the sort order of items returned by the API and the way the conversation tree is represented
The API calls the Lambda functions with a payload described in this local file [~/Code/WiseWords/Beta/WiseWords.ConversationsAndPosts.AWS.Lambdas/KeyInfo.md](WiseWords.ConversationsAndPosts.AWS.Lambdas/KeyInfo.md)

