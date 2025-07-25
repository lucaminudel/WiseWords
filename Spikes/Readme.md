# Wise Words Spikes

Below are the initial spikes I have done to explore and try-out the key technical components needed for the *Wise Words* forum application, all while experimenting with **AI-assisted coding**.


### Spike A: DynamoDb schema and basic operations code  

Here in the DynamoDbLocalDockerImage folder [(link)](../DynamoDbLocalDockerImage) is 
- the single-table db schema I have designed for the NoSQL DynamoDB
- the scripts I have written to pull/create, start and stop the db, the Docker image and containers.

I also used a tool like NoSQL Workbench for DynamoDB to visually inspect the content of the db and to perform basic operations.

Here in the SpikeA.DynamoDbAccessCode folder [(link)](SpikeA.DynamoDbAccessCode) is the code I have created and tested to perform programmatically the basic operations on the db.

I have designed the single-table **WiseWordTable** to store the conversations threads. These are the details of the table design:

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

Here in the **SpikeB.WiseWordsAWSLambdaFacade.Tests** folder [(link)](SpikeB.WiseWordsAWSLambdaFacade.Tests) there are unit tests for the lambdas using a manually coded mock context that could be replaced by one provided by the library Amazon.Lambda.TestUtilities. These unit tests validate request/response serialisation and verify proper error handling. 
This spike has also been successfully tested locally with the **AWS Lambda .NET Mock Lambda Test Tool** as part of the test strategy for local testing.

I have implemented these related Lambda functions in a single Handler Class:

1. **CreateNewConversationHandler**: Creates a new conversation root post
2. **RetrieveConversationsHandler**: Retrieves a list of conversations by year using DynamoDB GSI for efficient querying and with optional author filtering.
3. **RetrieveConversationPostsHandler**: Fetches all posts within a specific conversation, sorted in a way that simplifies re-creating the hierarchical post structure.
4. **AppendDrillDownPostHandler**: Adds drill-down (sub-problem/sub-question, sub-dilemma) posts to a conversation
5. **AppendCommentPostHandler**: Adds comment posts in a flat threading structure
6. **AppendConclusionPostHandler**: Adds a conclusion post (solutions/answers/choices)
7. **AdministrativeNonAtomicDeleteConversationAndPostsHandler**: is an Administrative function that deletes an entire conversation tree. It is Non-atomic (for efficiency reasons, this is an acceptable trade-off at this stage)

This is the command to run the **AWS Lambda .NET Mock Lambda Test Tool** from the command line, which opens a web page from wich it is possible to invoke the lambdas:

```bash
dotnet-lambda-test-tool-8.0  
```

And these are a few payload examples that I used to manually invoke the lambdas via the web page:
```code

# CreateNewConversationHandler
{"NewGuid":"123e4567-e89b-12d3-a456-426614174000", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2024-07-03T12:00:00Z"}

# RetrieveConversationsHandler
{"UpdatedAtYear": 2024}

# AppendCommentPostHandler
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewCommentGuid":"1506b802-b38c-414b-9f1d-99e7304f1eab", "Author":"LukeJ","MessageBody":"Hellp new body", "UpdatedAtYear":"2025", "ConvoType":"PROBLEM", "UpdatedAt":"1751686529" }

# AppendDrillDownPostHandler
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewDrillDownGuid":"9b4b401f-a2e2-41ca-b572-61c116c1071a", "Author":"VictorW","MessageBody":"Drill down body", "UpdatedAtYear":"2025",  "UpdatedAt":"1751686529" }

# AppendConclusionPostHandler
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewConclusionGuid":"c6dcf772-dbb1-4916-9c44-c144e8a55c2a", "Author":"JudyB","MessageBody":"Conclusion body", "UpdatedAtYear":"2025",  "UpdatedAt":"1751686529" }

# RetrieveConversationPostsHandler
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000"}

# AdministrativeNonAtomicDeleteConversationAndPostsHandler
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000"}

```


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

During this Spike, I discovered the lack of native support for multi-project .NET solutions in AWS SAM, and I have found a different strategy to deploy the application in SAM. This is the command I used to build all the code for the local SAM Docker:

```bash
dotnet publish WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.csproj  -c Release -o ./publish -r linux-x64
```

And this is the command I used to deploy the code build locally to the local SAM Docker: 

```bash
sam local start-api  --template template.yaml
```

instead of the common
```bash
sam build
sam local start-api  --template template.yaml 
```

One last note on the limitation of **AWS SAM Integration** local Docker container. I could not download and run the remote debugger and, from my local IDE, remotely debug  the code of this Spike running on the SAM local Docker, because the container did not have even the basic commands like tar, needed for the installation. Instead, where needed, I used the logger to print out the diagnostic info I needed.
