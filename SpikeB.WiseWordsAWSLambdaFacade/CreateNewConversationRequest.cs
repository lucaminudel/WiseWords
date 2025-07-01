using DynamoDbAccessCodeToAWSLambda;

namespace SpikeB.WiseWordsAWSLambdaFacade;

// Request DTOs
public class CreateNewConversationRequest
{
    public Guid NewGuid { get; set; }
    public ConversationsAndPosts.ConvoTypeEnum ConvoType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string MessageBody { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public DateTimeOffset UtcCreationTime { get; set; }
}
