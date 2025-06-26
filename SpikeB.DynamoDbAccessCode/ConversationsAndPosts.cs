namespace DynamoDbAccessCodeToAWSLambda;

using Newtonsoft.Json;

public class ConversationsAndPosts
{

    public enum ConvoTypeEnum
    {
        QUESTION,
        PROBLEM,
        DILEMMA
    }

    public async Task<string> CreateNewConversation(Guid newGuid, ConvoTypeEnum convoType, string title, string messageBody, string author, DateTimeOffset utcCreationTime)
    {
        // Placeholder for .NET AWS SDK code that writes a Conversation root-post item to DynamoDb single-table WiseWordsTable, and returns its json string
        await Task.CompletedTask;

        return string.Empty;
    }

    public async Task<List<string>> RetrieveConversations(int updatedAtYear, string filterByauthor = "")
    {
        // Placeholder for .NET AWS SDK code that retrieves all Conversation root-post itents from a DynamoDb single-table WiseWordsTable, and returns their json string
        await Task.CompletedTask;

        return new List<string>();
    }

    public async Task<List<string>> RetrieveConversationPosts(string conversationPK)
    {
        // Placeholder for .NET AWS SDK code that retrieves a Conversation root-post itent and all its sub-posts 
        // from a DynamoDb single-table WiseWordsTable, and returns their json string
        await Task.CompletedTask;

        return new List<string>();
    }

    public async Task AdministrativeNonAtomicDeleteConversationAndPosts(string conversationPK)
    {
        // Placeholder for .NET AWS SDK code that deletes all Conversation root-post itents from a DynamoDb and all their sub-posts
        await Task.CompletedTask;

        return;
    }

    public async Task<string> AppendDrillDownPost(string conversationPK, string parentPostSK, Guid newPostGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
    {
        // Placeholder for .NET AWS SDK code that writes a DrillDown sub-post iten to DynamoDb single-table WiseWordsTable, and returns its json string
        await Task.CompletedTask;

        return string.Empty;
    }

    public async Task<string> AppendCommentPost(string conversationPK, string parentPostSK, Guid newCommentGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
    {
        // Placeholder for .NET AWS SDK code that writes a Comment sub-post iten to DynamoDb single-table WiseWordsTable, and returns its json string
        await Task.CompletedTask;

        return string.Empty;
    }

    public async Task<string> AppendConclusionPost(string conversationPK, string parentPostSK, Guid newConclusionGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
    {
        // Placeholder for .NET AWS SDK code that writes a Conclusion sub-post iten to DynamoDb single-table WiseWordsTable, and returns its json string
        await Task.CompletedTask;

        return string.Empty;
    }


}



