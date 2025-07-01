using Amazon.Lambda.Core;
using DynamoDbAccessCodeToAWSLambda;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace SpikeB.WiseWordsAWSLambdaFacade;

public class ConversationsAndPostsLambdaHandlers
{
    private readonly ConversationsAndPosts _service = new ConversationsAndPosts();

    public async Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context)
        => await _service.CreateNewConversation(req.NewGuid, req.ConvoType, req.Title, req.MessageBody, req.Author, req.UtcCreationTime);

    public async Task<List<string>> RetrieveConversationsHandler(RetrieveConversationsRequest req, ILambdaContext context)
        => await _service.RetrieveConversations(req.UpdatedAtYear, req.FilterByAuthor);

    public async Task<List<string>> RetrieveConversationPostsHandler(RetrieveConversationPostsRequest req, ILambdaContext context)
        => await _service.RetrieveConversationPosts(req.ConversationPK);

    public async Task AdministrativeNonAtomicDeleteConversationAndPostsHandler(DeleteConversationRequest req, ILambdaContext context)
        => await _service.AdministrativeNonAtomicDeleteConversationAndPosts(req.ConversationPK);

    public async Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context)
        => await _service.AppendDrillDownPost(req.ConversationPK, req.ParentPostSK, req.NewPostGuid, req.Author, req.MessageBody, req.UtcCreationTime);

    public async Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context)
        => await _service.AppendCommentPost(req.ConversationPK, req.ParentPostSK, req.NewCommentGuid, req.Author, req.MessageBody, req.UtcCreationTime);

    public async Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context)
        => await _service.AppendConclusionPost(req.ConversationPK, req.ParentPostSK, req.NewConclusionGuid, req.Author, req.MessageBody, req.UtcCreationTime);
}
