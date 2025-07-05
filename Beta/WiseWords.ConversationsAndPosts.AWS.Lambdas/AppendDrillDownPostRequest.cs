
namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class AppendDrillDownPostRequest
{
    public string ConversationPK { get; set; } = string.Empty;
    public string ParentPostSK { get; set; } = string.Empty;
    public Guid NewDrillDownGuid { get; set; }
    public string Author { get; set; } = string.Empty;
    public string MessageBody { get; set; } = string.Empty;
    public DateTimeOffset UtcCreationTime { get; set; }
}
