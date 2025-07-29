# Lambdas' Json 

The below are examples of well-formed JSON that can be used to call the Lambdas.
These examples can be used with the tool AWS Lambda .NET Mock Lambda Test Tool, invoked via command line: dotnet-lambda-test-tool-8.0  

## Create New Conversation
{"NewGuid":"123e4567-e89b-12d3-a456-426614174000", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2024-07-03T12:00:00Z"}

##  Retrieve Conversations
{"UpdatedAtYear": 2025}

## Append Comment post
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewCommentGuid":"1506b802-b38c-414b-9f1d-99e7304f1eab", "Author":"LukeJ","MessageBody":"Hellp new body", "UpdatedAtYear":"2025", "ConvoType":"PROBLEM", "UpdatedAt":"1751686529" }

## Append DrillDown post 
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewDrillDownGuid":"9b4b401f-a2e2-41ca-b572-61c116c1071a", "Author":"VictorW","MessageBody":"Drill down body", "UpdatedAtYear":"2025",  "UpdatedAt":"1751686529" }


## Append Conclusion
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000", "ParentPostSK":"", "NewConclusionGuid":"c6dcf772-dbb1-4916-9c44-c144e8a55c2a", "Author":"JudyB","MessageBody":"Conclusion body", "UpdatedAtYear":"2025",  "UpdatedAt":"1751686529" }

# Retrieve Conversation posts
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000"}

## Delete conversation
{"ConversationPK":"CONVO#123e4567-e89b-12d3-a456-426614174000"}
