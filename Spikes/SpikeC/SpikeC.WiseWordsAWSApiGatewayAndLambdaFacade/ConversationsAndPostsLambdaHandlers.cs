using Amazon.Lambda.Core;
using DynamoDbAccessCodeToAWSLambda;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade;

public class ConversationsAndPostsLambdaHandlers
{
    private readonly ConversationsAndPosts _service = new ConversationsAndPosts();
    private readonly IHandlerObserver _observer;

    public ConversationsAndPostsLambdaHandlers() : this(new LambdaLoggerObserver())
    {
    }

    public ConversationsAndPostsLambdaHandlers(IHandlerObserver observer)
    {
        _observer = observer;
    }

    public async Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=CreateNewConversationHandler, RequestId={context.AwsRequestId}, NewGuid={req.NewGuid}", context);
        try
        {
            var result = await _service.CreateNewConversation(req.NewGuid, req.ConvoType, req.Title, req.MessageBody, req.Author, req.UtcCreationTime);
            _observer.OnSuccess($"Handler=CreateNewConversationHandler, RequestId={context.AwsRequestId}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=CreateNewConversationHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task<List<string>> RetrieveConversationsHandler(RetrieveConversationsRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=RetrieveConversationsHandler, RequestId={context.AwsRequestId}, UpdatedAtYear={req.UpdatedAtYear}, FilterByAuthor={req.FilterByAuthor}", context);
        try
        {
            var result = await _service.RetrieveConversations(req.UpdatedAtYear, req.FilterByAuthor);
            _observer.OnSuccess($"Handler=RetrieveConversationsHandler, RequestId={context.AwsRequestId}, ResultCount={result.Count}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=RetrieveConversationsHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task<List<string>> RetrieveConversationPostsHandler(RetrieveConversationPostsRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=RetrieveConversationPostsHandler, RequestId={context.AwsRequestId}, ConversationPK={req.ConversationPK}", context);
        try
        {
            var result = await _service.RetrieveConversationPosts(req.ConversationPK);
            _observer.OnSuccess($"Handler=RetrieveConversationPostsHandler, RequestId={context.AwsRequestId}, ResultCount={result.Count}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=RetrieveConversationPostsHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task AdministrativeNonAtomicDeleteConversationAndPostsHandler(DeleteConversationRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=AdministrativeNonAtomicDeleteConversationAndPostsHandler, RequestId={context.AwsRequestId}, ConversationPK={req.ConversationPK}", context);
        try
        {
            await _service.AdministrativeNonAtomicDeleteConversationAndPosts(req.ConversationPK);
            _observer.OnSuccess($"Handler=AdministrativeNonAtomicDeleteConversationAndPostsHandler, RequestId={context.AwsRequestId}", context);
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=AdministrativeNonAtomicDeleteConversationAndPostsHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=AppendDrillDownPostHandler, RequestId={context.AwsRequestId}, ConversationPK={req.ConversationPK}, ParentPostSK={req.ParentPostSK}, NewPostGuid={req.NewPostGuid}", context);
        try
        {
            var result = await _service.AppendDrillDownPost(req.ConversationPK, req.ParentPostSK, req.NewPostGuid, req.Author, req.MessageBody, req.UtcCreationTime);
            _observer.OnSuccess($"Handler=AppendDrillDownPostHandler, RequestId={context.AwsRequestId}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=AppendDrillDownPostHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=AppendCommentPostHandler, RequestId={context.AwsRequestId}, ConversationPK={req.ConversationPK}, ParentPostSK={req.ParentPostSK}, NewCommentGuid={req.NewCommentGuid}", context);
        try
        {
            var result = await _service.AppendCommentPost(req.ConversationPK, req.ParentPostSK, req.NewCommentGuid, req.Author, req.MessageBody, req.UtcCreationTime);
            _observer.OnSuccess($"Handler=AppendCommentPostHandler, RequestId={context.AwsRequestId}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=AppendCommentPostHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }

    public async Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context)
    {
        _observer.OnStart($"Handler=AppendConclusionPostHandler, RequestId={context.AwsRequestId}, ConversationPK={req.ConversationPK}, ParentPostSK={req.ParentPostSK}, NewConclusionGuid={req.NewConclusionGuid}", context);
        try
        {
            var result = await _service.AppendConclusionPost(req.ConversationPK, req.ParentPostSK, req.NewConclusionGuid, req.Author, req.MessageBody, req.UtcCreationTime);
            _observer.OnSuccess($"Handler=AppendConclusionPostHandler, RequestId={context.AwsRequestId}", context);
            return result;
        }
        catch (Exception ex)
        {
            _observer.OnError($"Handler=AppendConclusionPostHandler, RequestId={context.AwsRequestId}", context, ex);
            throw;
        }
    }
}
