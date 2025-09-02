# Wise Words: a forum for conversations that find a destination

Wise Words is a side-project where I'm experimenting with **AI-assisted coding** (several LLMs and AI-native/AI-enhanced IDEs -  it is far too early to commit to only one tool and only one LLM), while refreshing my skills in **cloud-native development** (AWS), including Serverless development (AWS Lambdas), **containers** (Docker, Kubernetes), **NoSQL** (DynamoDB), automated testing, DevOps and CI/CD.

In short, *Wise Words* is a basic forum for finding answers to difficult questions, exploring solutions to intractable problems, and discussing dilemmas to find suitable options collaboratively.

**Wise Words** encourages having **one collaborative conversation at a time** by supporting simple linear comments - as opposed to nested comments that equate to multiple overlapping conversations and talking over each other.
As the conversation unfolds, and the common understanding of the matter at hand grows, the forum allows consolidating the newfound understanding into **sub-questions, sub-problems, sub-dilemmas, and proposed conclusions** from which the conversation can proceed toward its destination. 

## A quick overview of the end result: this Beta

### The type of work done with the help of several LLMs AKA AI-assistants AKA genies

This is a greenfield project done with the intent of realising a specific idea and refreshing my tech skills, with coding, design, architecture and modern technologies.

As such, this project is potentially low-risk (no business revenue or existing clients impacted) and high-reward (from the learning , and from potential interest in the practical applications of this beta).

For all these reasons, I used the AI-assistants exercising a  **high level of control** of the features produced, the **What**, and a **high level of attention** in the review of the solutions produced and their internal quality, the **How**.

I followed a Chat-Oriented Programming (ChOP) approach that emphasises high control over features, **the What**, and diligent review of code quality, **the How**, rather than a less structured 'vibe coding' style.

The initial work done to explore the latest technologies with some Spikes/POC took a month of part-time, flexible schedule work.
The following beta implementation work took the same amount of time. Half of it was dedicated to new learning and refreshing some skills. Under normal circumstances, this phase would take approximately two weeks. This is to give an idea of the size of the endeavour.

After exploring the various options, possibilities and trade-offs with the help of the LLMs, the available documentation and training, I personally made all the decisions related to the 
- production infrastructure and system architecture (AWS)
- the tech-stack
- the design of the system and the data
- the design of the code.

On the backend (the NoSQL data store and related code, the lambdas and the API gateway code), the LLMs created about 70% of the code, and I contributed the the remaining  30% of the code ensuring a high standard of quality and maintainability.
On the frontend (React, TypeScript, CSS), the LLMs created about 95% of the code, and I created about 5% of the code. While some of the prompts went into the details of the algorithm, and many other implementation details, always leaving the final responsibility of writing and changing the code to the LLMs.
For the configuration scripts of AWS, DynamoDB, and the local dev environment, the code written by the LLM was even closer to 100%.

I implemented this beta with the goals of 
- minimising the cost of running it in production
- starting with a simple solution
- preserving the possibility of gradually scaling as needed.

To bring the current to the level of an enterprise application, only a few minor improvements are required:
- replacing some abuse of defensive programming typical of LLMs with some more intentional programming
- adding a more fine-grained run-time error management
- improving some aspects of security
- adding some configuration and some simple code to enable elastic scalability.

## What I’ve learned so far coding with an AI-agent AKA genie
This beta is a greenfield project, potentially low-risk and high-reward, that demanded a high level of control over the features and a diligent review of internal quality. In this context:
- I've documented my key learnings from this, the link is coming soon
-  I've shared some of the commands and context I used to guide the AI, which you can see here: [MyAI-AgentCustomRules.md](./Beta/MyAI-AgentCustomRules.md)

When considering what worked well, it's essential to remember that all of this is context-specific, The value comes from asking follow-up questions like:
- have you tried something similar and what were your results? 
- what insights can we gain by comparing the similarities and differences in our contexts?
- what else is working (or not working) for you?

These questions can be applied to various scenarios that may differ from this beta, like for a: 
- Throw away prototype, or for
- Long living and/or legacy product codebase maintenance and evolution.

## The Beta live. Try it!
- Link coming soon

## The latest Beta key info
- Here is key info on the implementation and its progress of *Wise Words*: follow the link [(link)](Beta/Readme.md) 

## Initial Specs: the anatomy of a Wise Words conversation

Here the main conversation elements:
- **Conversation**: Conversation post is the root of a conversation tree
- **Comment**: Comment posts form a list of posts in a flat threading structure.
- **Drill-Down**: Drill-Down posts are organised in a nested threading structure.
- **Conclusion**: a Conclusion post is like a Drill-Down post but it cannot be followed by any other post.

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
    UI["User Interface (UI) - Client Side Rendering (CSR) Web Pages"]
    

    %% Connections with labels
    CloudFront -->|Serves and cache| S3
    S3 -->|Handles auth via| Cognito
    S3 -->|Calls HTTP APIs| APIGateway
    S3 -->|Renders static assets| UI
    APIGateway -->|Invokes| Lambda
    Lambda -->|Reads/Writes| DynamoDB

    %% Assign classes to nodes
    class CloudFront frontend;
    class S3 frontend;
    class Cognito auth;
    class APIGateway api;
    class Lambda api;
    class DynamoDB db;
    class frontend2 sdk;
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

## Other online tools used

- [GUID Generator](https://guidgenerator.app/)
- [Epoch & Unix Timestamp Conversion Tools](https://www.epochconverter.com/)
- [JSON validator and formatter](https://jsonlint.com/)

## The Spikes (Experiments and POC with the main components of the tech-stack)
- Here are the spikes, now completed: follow the [(link)](Spikes/Readme.md) for the related details
