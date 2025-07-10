# Wise Words Spikes

Below are the initial spikes I have done to explore and try-out the key technical components needed for the *Wise Words* forum application, all while experimenting with **AI-assisted coding**.


### Spike A: DynamoDb schema and basic operations code  

Here in the DynamoDbLocalDockerImage folder [(link)](../../DynamoDbLocalDockerImage) is 
- the single-table db schema I have designed for the NoSQL DynamoDB
- the scripts I have written to pull/create, start and stop the db, the Docker image and containers.

I also used a tool like NoSQL Workbench for DynamoDB to visually inspect the content of the db and to perform basic operations.

Here in the SpikeA.DynamoDbAccessCode folder [(link)](SpikeA.DynamoDbAccessCode) is the code I have created and tested to perform programmatically the basic operations on the db.

I have designed the single-table **WiseWordTable** to host these types of items:
- **Conversation**: Conversation post is the root of a conversation tree
- **Comment**: Comment posts form a list of posts in a flat threading structure.
- **Drill-Down**: Drill-Down posts are organised in a nested threading structure.
- **Conclusion**: a Conlusion post is like a Drill-Down post but cannot be followed by any other post.

A **Conversation** root post can be followed by a flat list of Comment posts, a few nested Drill-Down posts, and a Conclusion Post. A **Drill Down** post can be followed by a flat list of Comment posts, a Conclusion post and a few nested Drill-Down posts.


A **Conversation** post can be one of these types:
- *Problem*: a problem in search of a solution
- *Question*: a question looking for an answer
- *Dilemma*: a choice with multiple options

In the user's language,
- For a *Problem* type of Conversation 
  - a Drill-Down post is called *Sub-problem*
  - a Conclusion post is called *Proposed solution*
- For a *Question* type of Conversation
  - a Drill-Down post is called *Sub-question*
  - a Conclusion post is called *Proposed answer*
- For a *Dilemma* type of Conversation
  - a Drill-Down post is called *Sub-dilemma*
  - a Conclusion post is called *Proposed choicer*


A **Conversation** post item has:
- **Partition Key**: CONVO#&lt;Conversation Guid&gt;
- **Sort Key**: METADATA


All the other posts' items have:
- **Partition Key**: CONVO#&lt;The related conversation Guid&gt;
- **Sort Key**: &lt;The tree path of the partents posts id&gt; + the post id:
  - **Comment** post id: #CM#&lt;Comment Guid&gt;
  - **Drill-down** post id: #DD#&lt;Drill-down Guid&gt;
  - **Conclusion** post id: #CC#&lt;Conclusion Guid&gt;

All post items have the following fields:
- Author (user identifier)
- UpdatedAt (timestamp)
- MessageBody

Where the **Conversation** post items also have these fields:
- Title
- ConvoType (Problem, Question or Dilemma)
- UpdatedAtYear

The single-table WiseWordsTable also has a **Global Secondary Index (GSI)** for retrieving the list of conversations by year (can be by week when the volume grows). The GSI structure is:
- GSI_PK: &lt;UpdatedAtYear&gt;
- GSI_SK: CONVO#&lt;Conversation Guid&gt;

With the non-PK/SK attributes projected from WiseWordsTable on GSI
- PK
- Title
- ConvoType
- Author

The code I have implemented in the SpikeA.DynamoDbAccessCode folder does open a connection to the DB and successfully executes read and write operations on the DB. It allowed me to find out and verify the correct approach of doing all this.

## Spike B: AWS Lambda Functions Implementation

In this Spike B, I focused on the implementation of AWS Lambda functions, their local deployment and testing. Specifically, on the implementation of serverless AWS Lambda functions to handle the core operations of the Wise Words forum application. Again, with help from several LLMs and AI-native/AI-enhanced IDEs while experimenting with **AI-assisted coding**.

With this spike, I explored all these points:
- Lambda function handler implementation
- Request/response modelling
- Error handling and logging
- Testing Lambda functions
- Configuration 

Here in the **SpikeB.WiseWordsAWSLambdaFacade** folder [(link)](SpikeB.WiseWordsAWSLambdaFacade) I have implemented AWS Lambda function handlers that expose the data access operations in the form of serverless functions. This code manages the AWS Lambda events, performs the serialisation/deserialisation, implements logging for monitoring and observability, applies dependency inversion for the class dependencies, and includes the required configuration files. I have followed a clean separation between handlers, business logic, and data access. 

Here in the **SpikeB.DynamoDbAccessCode** folder [(link)](SpikeB.DynamoDbAccessCode) there is a simplified/placeholder implementation of the data access code from Spike A, for the lambdas to use.

Here in the **SpikeB.WiseWordsAWSLambdaFacade.Tests** folder [(link)](SpikeB.WiseWordsAWSLambdaFacade.Tests) there are unit tests for the lambdas using a mock context and the Amazon.Lambda.TestUtilities library. The tests validate request/response serialisation and verify proper error handling. This spike has also been successfully tested locally with the **AWS Lambda .NET Mock Lambda Test Tool** as part of the test strategy for local testing.


I have implemented these related Lambda functions in a single Handler Class:

1. **CreateNewConversationHandler**: Creates a new conversation root post
2. **RetrieveConversationsHandler**: Retrieves a list of conversations by year using DynamoDB GSI for efficient querying and with optional author filtering.
3. **RetrieveConversationPostsHandler**: Fetches all posts within a specific conversation, sorted in a way that simplifies re-creating the hierarchical post structure.
4. **AppendDrillDownPostHandler**: Adds drill-down (sub-problem/sub-question, sub-dilemma) posts to a conversation
5. **AppendCommentPostHandler**: Adds comment posts in a flat threading structure
6. **AppendConclusionPostHandler**: Adds a conclusion post (solutions/answers/choices)
7. **AdministrativeNonAtomicDeleteConversationAndPostsHandler**: is an Administrative function that deletes an entire conversation tree. It is Non-atomic (for efficiency reasons, this is an acceptable trade-off at this stage)

The learnings from this Spike B are the foundation for the following implementation of the API Gateway integration Spike.

## Wise Words Spike C: API Gateway + Lambda Integration

In this Spike C, I focused on the implementation of an AWS API Gateway and its integration with the Lambda functions created in Spike B. This API Gateway provides a complete HTTP API for the Wise Words forum application, exposing the serverless lambda functions from Spike B through HTTP endpoints.


In this spike, I:
- implemented a single Lambda function handling class with multiple HTTP routes
- implemented an API Gateway proxy and its integration with Lambda, including the HTTP request routing logic and parameter extraction
- have found the way to locally develop and test all this using AWS SAM
- implemented the error handling and input validation at the API layer


The SpikeC.DynamoDbAccessCode folder contains the identical data access layer placeholder as in Spike B.

Here the SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade folder [(link)](Spikes/SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade) there is the implementation of the API Gateway integration layer that routes HTTP requests to multiple lambda functions based on the HTTP method and path. It maintains a clean separation between the API layer and the rest of the code.

This code also handles the serialisation/deserialisation, error handling, and HTTP status codes.

The AI-Assited code generation led to a mixed RESTful and RPC style and some generic return codes that need to be fixed in the beta of the *Wise Words* forum application.

As mentioned previously, I used **AWS SAM Integration** that runs locally on Docker, to deploy and test locally the API Gateway + Lambda Integration.

During this Spike, I discovered the lack of native support for multi-project .NET solutions in AWS SAM, and I have found a different strategy to deploy the application in SAM.

