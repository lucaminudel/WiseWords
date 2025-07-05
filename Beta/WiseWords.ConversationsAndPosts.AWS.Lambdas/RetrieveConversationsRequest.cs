
namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class RetrieveConversationsRequest
{
    public int UpdatedAtYear { get; set; }
    public string FilterByAuthor { get; set; } = string.Empty;
}
