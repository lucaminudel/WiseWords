using Amazon.Lambda.Core;
using DynamoDbAccessCodeToAWSLambda;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWordsLambda;

public class Function
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

// Request DTOs
public class CreateNewConversationRequest
{
    public Guid NewGuid { get; set; }
    public ConversationsAndPosts.ConvoTypeEnum ConvoType { get; set; }
    public string Title { get; set; }
    public string MessageBody { get; set; }
    public string Author { get; set; }
    public DateTimeOffset UtcCreationTime { get; set; }
}

public class RetrieveConversationsRequest
{
    public int UpdatedAtYear { get; set; }
    public string FilterByAuthor { get; set; }
}

public class RetrieveConversationPostsRequest
{
    public string ConversationPK { get; set; }
}

public class DeleteConversationRequest
{
    public string ConversationPK { get; set; }
}

public class AppendDrillDownPostRequest
{
    public string ConversationPK { get; set; }
    public string ParentPostSK { get; set; }
    public Guid NewPostGuid { get; set; }
    public string Author { get; set; }
    public string MessageBody { get; set; }
    public DateTimeOffset UtcCreationTime { get; set; }
}

public class AppendCommentPostRequest
{
    public string ConversationPK { get; set; }
    public string ParentPostSK { get; set; }
    public Guid NewCommentGuid { get; set; }
    public string Author { get; set; }
    public string MessageBody { get; set; }
    public DateTimeOffset UtcCreationTime { get; set; }
}

public class AppendConclusionPostRequest
{
    public string ConversationPK { get; set; }
    public string ParentPostSK { get; set; }
    public Guid NewConclusionGuid { get; set; }
    public string Author { get; set; }
    public string MessageBody { get; set; }
    public DateTimeOffset UtcCreationTime { get; set; }
}
