

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;


public class CreateNewConversationRequest
{
    public Guid NewGuid { get; set; }
    public DataStore.ConversationsAndPosts.ConvoTypeEnum ConvoType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string MessageBody { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public DateTimeOffset UtcCreationTime { get; set; }
}
