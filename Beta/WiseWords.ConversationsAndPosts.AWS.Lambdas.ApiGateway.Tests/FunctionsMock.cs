using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

public class FunctionsMock : IFunctions
{
    public string? LastConversationPK { get; private set; }
    public bool WasRetrieveCalled { get; private set; }
    public bool WasDeleteCalled { get; private set; }


    public Task<List<Dictionary<string, string>>> RetrieveConversationPostsHandler(RetrieveConversationPostsRequest req, ILambdaContext context)
    {
        LastConversationPK = req.ConversationPK;
        WasRetrieveCalled = true;
        return Task.FromResult<List<Dictionary<string, string>>>([]);
    }

    public Task AdministrativeNonAtomicDeleteConversationAndPostsHandler(DeleteConversationRequest req, ILambdaContext context)
    {
        LastConversationPK = req.ConversationPK;
        WasDeleteCalled = true;
        return Task.CompletedTask;
    }

    public Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }

    public Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }

    public Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }

    public Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }


    public Task<List<Dictionary<string, string>>> RetrieveConversationsHandler(RetrieveConversationsRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }

    public Task SendConversationInviteEmailHandler(SendConversationInviteRequest req, ILambdaContext context)
    {
        throw new NotImplementedException();
    }
}
