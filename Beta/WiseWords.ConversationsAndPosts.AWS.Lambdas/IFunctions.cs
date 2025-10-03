using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas
{
    public interface IFunctions
    {
        Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context);
        Task<List<Dictionary<string, string>>> RetrieveConversationsHandler(RetrieveConversationsRequest req, ILambdaContext context);
        Task<List<Dictionary<string, string>>> RetrieveConversationPostsHandler(RetrieveConversationPostsRequest req, ILambdaContext context);
        Task AdministrativeNonAtomicDeleteConversationAndPostsHandler(DeleteConversationRequest req, ILambdaContext context);
        Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context);
        Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context);
        Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context);
        Task SendConversationInviteEmailHandler(SendConversationInviteRequest req, ILambdaContext context);
    }
}