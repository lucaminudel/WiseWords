Other then the Unit tests in this solution, this AWS lambda can be tested with this tool:
- AWS Lambda .NET Mock Lambda Test Tool

After installing it, in a terminal from the project folder, run the command:
- dotnet-lambda-test-tool-8.0  

And from the web page http://localhost:5050/
1 - choose from the drop down the config about creating a new conversation
2 - use the payload below:

{"NewGuid":"123e4567-e89b-12d3-a456-426614174000", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2024-07-03T12:00:00Z"}
