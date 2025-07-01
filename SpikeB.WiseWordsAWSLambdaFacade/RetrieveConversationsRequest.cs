
namespace SpikeB.WiseWordsAWSLambdaFacade;

public class RetrieveConversationsRequest
{
    public int UpdatedAtYear { get; set; }
    public string FilterByAuthor { get; set; } = string.Empty;
}
