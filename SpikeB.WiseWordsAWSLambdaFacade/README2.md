# WiseWords Solution

This repository contains a .NET solution with two projects:

- **DynamoDbAccessCodeToAWSLambda**: Class library containing business logic (e.g., ConversationsAndPosts).
- **WiseWordsLambda**: AWS Lambda project that exposes Lambda handlers and references the class library.

## Structure
- Business logic is kept in the class library for testability and reuse.
- Lambda-specific code (handlers, serialization, etc.) is in the Lambda project.

## Getting Started
1. Open the workspace in Visual Studio Code using `WiseWordsWorkspace.code-workspace`.
2. Build the solution:
   ```sh
   dotnet build
   ```
3. Implement Lambda handlers in the Lambda project to call into the class library.
4. Use the AWS Lambda .NET Mock Lambda Test Tool or deploy to AWS for testing.

## Requirements
- .NET 8 SDK
- AWS Lambda .NET CLI tools (optional, for deployment)

## Deployment
Use the AWS Toolkit for VS Code or the `dotnet lambda` CLI to deploy Lambda functions.
