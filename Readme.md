# Wise Words: a forum for conversations that find a destination

Wise Words is a side-project where I'm experimenting with **AI-assisted coding** (several LLMs and AI-native/AI-enhanced IDEs) -  it is far too early to commit to only one tool and only one LLM), while refreshing my skills in **cloud-native development** (AWS), including Serverless development (AWS Lambdas), **containers** (Docker, Kubernetes), **NoSQL** (DynamoDB), automated testing, DevOps and CI/CD.

In short, *Wise Words* is a basic forum for finding answers to difficult questions, exploring solutions to intractable problems, and discussing dilemmas to find suitable options collaboratively.

**Wise Words** encourages having **one collaborative conversation at a time** by supporting simple linear comments - as opposed to nested comments that equate to multiple overlapping conversations and talking over each other.
As the conversation unfolds, and the common understanding of the matter at hand grows, the forum allows consolidating the newfound understanding into **sub-questions, sub-problems, sub-dilemmas, and proposed conclusions** from which the conversation can proceed toward its destination. 

### The anatomy of a Wise Words conversation

Here the main conversation elements:
- **Conversation**: Conversation post is the root of a conversation tree
- **Comment**: Comment posts form a list of posts in a flat threading structure.
- **Drill-Down**: Drill-Down posts are organised in a nested threading structure.
- **Conclusion**: a Conlusion post is like a Drill-Down post but cannot be followed by any other post.

A **Conversation** root post can be followed by a flat list of Comment posts, a few nested Drill-Down posts, and a Conclusion Post. A **Drill Down** post can be followed by a flat list of Comment posts, a Conclusion post and a few nested Drill-Down posts.


A **Conversation** post can be one of these types:
- *Problem*: a problem in search of a solution
- *Question*: a question looking for an answer
- *Dilemma*: a choice among multiple available options

In the user's language,
- For a *Problem* type of Conversation 
  - a Drill-Down post is called *Sub-problem*
  - a Conclusion post is called *Proposed solution*
- For a *Question* type of Conversation
  - a Drill-Down post is called *Sub-question*
  - a Conclusion post is called *Proposed answer*
- For a *Dilemma* type of Conversation
  - a Drill-Down post is called *Sub-dilemma*
  - a Conclusion post is called *Proposed choice*


## The Spikes
- Here are the spikes: follow the [(link)](Spikes/Readme.md) for the related details

## The latest Beta
- Here is the Beta of *Wise Words*, still under development: follow the link [(link)](Beta/Readme.md) for the related details

## Technical design

The general principle I'm using for the design of *Wise Words* is to start **simple**, without precluding any options for future developments.

This design employs a **serverless architecture** that comes with a pay-per-use model (initial cost efficiency and no operational overhead) with the benefit of out-of-the-box high-availability and scalability if needed.
From the integration with this Cloud ecosystem also comes the possibility to use out-of-the-box Serverless Authentication and User Management, as infrastructure as code (IaC) services, and automated deployments, which I plan to use.

#### Sizing
In the current design and implementation, I am making the initial assumption of having to support a very low to medium volume of traffic, for example: 
- a thousand users 
- a few hundred conversations 
- hundreds of posts per conversation 
- a few hundred posts per day 
With the possibility of quickly and simply evolving the design to support increased traffic volume.

#### System design:

```mermaid
%% Final Styled Serverless Architecture Diagram

graph TD
    %% Class Definitions first
    classDef frontend fill:#fbe8a6,stroke:#333,stroke-width:1px,color:#000000;
    classDef auth fill:#b3d9ff,stroke:#333,stroke-width:1px,color:#000000;
    classDef api fill:#c1f0c1,stroke:#333,stroke-width:1px,color:#000000;
    classDef db fill:#ffd6cc,stroke:#333,stroke-width:1px,color:#000000;
    classDef sdk fill:#e0ccff,stroke:#333,stroke-width:1px,color:#000000;

    %% Nodes (square brackets) with simplified labels (no parentheses)
    S3[S3 Bucket - Static Website Hosting]
    CloudFront[Amazon CloudFront - CDN]
    Cognito[Amazon Cognito User Pools]
    APIGateway[Amazon API Gateway HTTP API]
    Lambda[AWS Lambda Microservices]
    DynamoDB[Amazon DynamoDB NoSQL Storage]
    Amplify[AWS Amplify JS libraries or JS SDK]
    UI["User Interface (UI) - Client Side Rendering (CSR) Web Pages"]
    

    %% Connections with labels
    S3 -->|Delivers static assets| CloudFront
    CloudFront -->|Serves CSR web pages| Amplify
    Amplify -->|Handles auth| Cognito
    Amplify -->|Calls HTTP APIs| APIGateway
    Amplify -->|Renders| UI
    APIGateway -->|Invokes| Lambda
    Lambda -->|Reads/Writes| DynamoDB

    %% Assign classes to nodes
    class S3,CloudFront frontend;
    class Cognito auth;
    class APIGateway,Lambda api;
    class DynamoDB db;
    class Amplify sdk;

```

#### Single-table data design:

![Figure 1: Wise Words Single Table](Readme-DbSchema.png)


At this stage, in the NoSQL DynamoDB design and code, I have decided not to verify the referential integrity, which instead will be ensured:
- by not implementing physical deletion of conversations and posts (logical deletion may be implemented in the near future), and 
- by the client code, allowing posts to be added only to existing conversations.
This will speed up the DB operations while also avoiding the additional pay-per-use cost of the transactional operations.



## Local Development Environment

I have started the development of this side project in the local development environment, while experimenting with **AI-assisted coding** as mentioned before. And I am approaching the development gradually, one simple block at a time, with help from:
- AWS DynamoDB local development instance on Docker
- AWS Lambda .NET Mock Lambda Test Tool, to develop and test locally Lambda functions
- AWS SAM (Serverless Application Model) for local development and testing of AWS API Gateway routing and Lambda events
