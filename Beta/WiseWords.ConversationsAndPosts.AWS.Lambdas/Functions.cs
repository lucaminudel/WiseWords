using Amazon.Lambda.Core;

using WiseWords.ConversationsAndPosts.DataStore;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas
{

    public class Functions : IFunctions
    {
        private readonly WiseWordsTable _service;
        private readonly ILoggerObserver _observer;
        private readonly Func<(string Name, string Email)>? _getAuthenticatedUser;

        public Functions() : this(
            new DataStore.Configuration.Loader().GetEnvironmentVariables().DynamoDbServiceLocalUrl,
            new DataStore.Configuration.Loader().GetEnvironmentVariables().AWS.Region, null)
        { }

        public Functions(
            Uri? localDynamoDbServiceUrl, 
            Amazon.RegionEndpoint? remoteDynamoDbRegion, 
            Func<(string, string)>? getAuthenticatedUser 
        ) 
            : this(localDynamoDbServiceUrl, remoteDynamoDbRegion, getAuthenticatedUser, new LoggerObserver("Lambda"))
        {
        }

        public Functions(
            Uri? dynamoDbServiceUrl, 
            Amazon.RegionEndpoint? remoteDynamoDbRegion, 
            Func<(string, string)>? getAuthenticatedUser, 
            ILoggerObserver observer
        )
        {
            _service = new DataStore.WiseWordsTable(dynamoDbServiceUrl, remoteDynamoDbRegion);
            _getAuthenticatedUser = getAuthenticatedUser;
            _observer = observer;
        }

        public async Task<string> CreateNewConversationHandler(CreateNewConversationRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.NewGuid)}={req.NewGuid}", context);

            try
            {
                var result = await _service.CreateNewConversation(req.NewGuid, req.ConvoType, req.Title, req.MessageBody, GetAuthor(req.Author, context).Name, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(CreateNewConversationHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
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
                _observer.OnFailure($"Handler={nameof(RetrieveConversationsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
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
                _observer.OnFailure($"Handler={nameof(RetrieveConversationPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
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
                _observer.OnFailure($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;

            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(AdministrativeNonAtomicDeleteConversationAndPostsHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendDrillDownPostHandler(AppendDrillDownPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewDrillDownGuid)}={req.NewDrillDownGuid}", context);

            try
            {
                var result = await _service.AppendDrillDownPost(req.ConversationPK, req.ParentPostSK, req.NewDrillDownGuid, GetAuthor(req.Author, context).Name, req.Title, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(AppendDrillDownPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendCommentPostHandler(AppendCommentPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewCommentGuid)}={req.NewCommentGuid}", context);

            try
            {
                var result = await _service.AppendCommentPost(req.ConversationPK, req.ParentPostSK, req.NewCommentGuid, GetAuthor(req.Author, context).Name, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(AppendCommentPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task<string> AppendConclusionPostHandler(AppendConclusionPostRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.ParentPostSK)}={req.ParentPostSK}, {nameof(req.NewConclusionGuid)}={req.NewConclusionGuid}", context);

            try
            {
                var result = await _service.AppendConclusionPost(req.ConversationPK, req.ParentPostSK, req.NewConclusionGuid, GetAuthor(req.Author, context).Name, req.Title, req.MessageBody, req.UtcCreationTime);

                _observer.OnSuccess($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

                return result;
            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(AppendConclusionPostHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        public async Task SendConversationInviteEmailHandler(SendConversationInviteRequest req, ILambdaContext context)
        {
            _observer.OnStart($"Handler={nameof(SendConversationInviteEmailHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(req.ConversationPK)}={req.ConversationPK}, {nameof(req.InviteeEmail)}={req.InviteeEmail}", context);

            // AWS SES is not an idempotent service, additional logic currently not implemented, is needed to ensure idempotency (from Lamba retries, couble Send clicks, etc.)

            try
            {
                await ValidateSendConversationInviteRequest(req);

                // Actual implementation of SES call for the AWS Dev Environment
                await Task.CompletedTask;

                _observer.OnSuccess($"Handler={nameof(SendConversationInviteEmailHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);
            }
            catch (Exception ex)
            {
                _observer.OnFailure($"Handler={nameof(SendConversationInviteEmailHandler)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context, ex);
                throw;
            }
        }

        private async Task ValidateSendConversationInviteRequest(SendConversationInviteRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.SenderUsername))
            {
                throw new ArgumentException("Sender Username cannot be null or empty.", nameof(req.SenderUsername));
            }

            if (_getAuthenticatedUser != null) {
                var authenticatedUser = _getAuthenticatedUser();
                if (req.SenderUsername != authenticatedUser.Name)
                {
                    throw new System.Security.SecurityException($"Sender Username '{req.SenderUsername}' does not match authenticated user '{authenticatedUser.Name}'.");
                }
            }

            if (string.IsNullOrWhiteSpace(req.InviteeEmail))
            {
                throw new ArgumentException("Invitee Email cannot be null or empty.", nameof(req.InviteeEmail));
            }
            
            try
            {
                new System.Net.Mail.MailAddress(req.InviteeEmail);
            }
            catch (FormatException)
            {
                throw new ArgumentException("Invitee Email is not a valid email address.", nameof(req.InviteeEmail));
            }

            if (string.IsNullOrWhiteSpace(req.InviteeName))
            {
                throw new ArgumentException("Invitee Name cannot be null or empty.", nameof(req.InviteeName));
            }

            var conversationAuthor = await _service.GetConversationAuthor(req.ConversationPK);
            if (req.SenderUsername != conversationAuthor)
            {
                throw new System.Security.SecurityException($"Sender Username '{req.SenderUsername}' does not match the Author of the conversation '{conversationAuthor}'.");
            }
        }

        private (string Name, string Email) GetAuthor(string requestAuthor, ILambdaContext context)
        {
            if (_getAuthenticatedUser == null)
            {
                return (requestAuthor, requestAuthor.Replace(" ", "") + "@development_environemnt.test" );                    
            }

            requestAuthor = requestAuthor.Trim();
            var authenticatedUser = _getAuthenticatedUser();
            var preferredUsername = authenticatedUser.Name;

            if (!string.IsNullOrEmpty(preferredUsername) && preferredUsername != requestAuthor)
            {
                _observer.OnWarning($"SECURITY WARNING: Request author '{requestAuthor}' does not match authenticated user '{preferredUsername}'", context);
            }

            if (string.IsNullOrEmpty(requestAuthor))
            {
                return (preferredUsername, authenticatedUser.Email);
            }

            return (requestAuthor, authenticatedUser.Email);
        }

   }
}