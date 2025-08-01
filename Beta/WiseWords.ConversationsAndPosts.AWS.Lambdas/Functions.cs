using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas
{

    public class Functions
    {
        private readonly DataStore.WiseWordsTable _service;
        private readonly ILoggerObserver _observer;

#pragma warning disable CS8604 // Possible null reference argument.
        public Functions() : this(new Uri(Environment.GetEnvironmentVariable("DYNAMODB_SERVICE_URL")) ) { }
#pragma warning restore CS8604 // Possible null reference argument.
        public Functions(Uri dynamoDbServiceUrl) : this(dynamoDbServiceUrl, new LoggerObserver("Lambda"))
        {
        }

        public Functions(Uri dynamoDbServiceUrl, ILoggerObserver observer)
        {
            ValidateServiceUrl(dynamoDbServiceUrl);
            _service = new DataStore.WiseWordsTable(dynamoDbServiceUrl);
            _observer = observer;
        }

        public async Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.NewGuid)}={req.NewGuid}", context);

            try
            {
                var result = await _service.CreateNewConversation(req.NewGuid, req.ConvoType, req.Title, req.MessageBody, req.Author, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<List<Dictionary<string, string>>> RetrieveConversationsHandler(RetrieveConversationsRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(RetrieveConversationsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.UpdatedAtYear)}={req.UpdatedAtYear}, {nameof(req.FilterByAuthor)}={req.FilterByAuthor}", context);

            try
            {
                var result = await _service.RetrieveConversations(req.UpdatedAtYear, req.FilterByAuthor);

                _observer.OnSuccess($"Handler={nameof(RetrieveConversationsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, ResultCount={result.Count}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(RetrieveConversationsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<List<Dictionary<string, string>>> RetrieveConversationPostsHandler(RetrieveConversationPostsRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(RetrieveConversationPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}", context);

            try
            {
                var result = await _service.RetrieveConversationPosts(req.ConversationPK);

                _observer.OnSuccess($"Handler={nameof(RetrieveConversationPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, ResultCount={result.Count}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(RetrieveConversationPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task AdministrativeNonAtomicDeleteConversationAndPostsHandler(DeleteConversationRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}", context);

            try
            {
                await _service.AdministrativeNonAtomicDeleteConversationAndPosts(req.ConversationPK);

                _observer.OnSuccess($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);
            }
            catch (InvalidOperationException ex)
            {
                _observer.OnError($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
                
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewDrillDownGuid)}={req.NewDrillDownGuid}", context);

            try
            {
                var result = await _service.AppendDrillDownPost(req.ConversationPK, req.ParentPostSK, req.NewDrillDownGuid, req.Author, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewCommentGuid)}={req.NewCommentGuid}", context);

            try
            {
                var result = await _service.AppendCommentPost(req.ConversationPK, req.ParentPostSK, req.NewCommentGuid, req.Author, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewConclusionGuid)}={req.NewConclusionGuid}", context);

            try
            {
                var result = await _service.AppendConclusionPost(req.ConversationPK, req.ParentPostSK, req.NewConclusionGuid, req.Author, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnError($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        private static void ValidateServiceUrl(Uri serviceUrl)
        {
            if (serviceUrl == null)
                throw new ArgumentNullException(nameof(serviceUrl));
            
            if (!serviceUrl.IsAbsoluteUri)
                throw new ArgumentException("Service URL must be an absolute URI", nameof(serviceUrl));
                
            if (!serviceUrl.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase) && 
                !serviceUrl.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Service URL must use HTTP or HTTPS scheme", nameof(serviceUrl));
        }
    }
}