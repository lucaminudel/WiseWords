using System.Net.Mail;
using Amazon.Lambda.Core;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;

using WiseWords.ConversationsAndPosts.DataStore;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas
{

    public class Functions : IFunctions
    {
        private readonly WiseWordsTable _service;
        private readonly ILoggerObserver _observer;
        private readonly Func<(string Name, string Email)>? _getAuthenticatedUser;
        private readonly Uri _websiteUrl;
        private readonly MailAddress _invitesSourceEmailAddress;

        public Functions() : this(
            new DataStore.Configuration.Loader().GetEnvironmentVariables().InvitesSourceEmailAddress,
            new DataStore.Configuration.Loader().GetEnvironmentVariables().WebsiteBaseUrl,
            new DataStore.Configuration.Loader().GetEnvironmentVariables().DynamoDbServiceLocalUrl,
            new DataStore.Configuration.Loader().GetEnvironmentVariables().AWS.Region, null)
        { }

        public Functions(
            MailAddress? invitesSourceEmailAddress,
            Uri? websiteUrl, 
            Uri? localDynamoDbServiceUrl, 
            Amazon.RegionEndpoint? remoteDynamoDbRegion, 
            Func<(string, string)>? getAuthenticatedUser 
        ) 
            : this(invitesSourceEmailAddress, websiteUrl, localDynamoDbServiceUrl, remoteDynamoDbRegion, getAuthenticatedUser, new LoggerObserver("Lambda"))
        {
        }

        public Functions(
            MailAddress? invitesSourceEmailAddress,
            Uri? websiteUrl, 
            Uri? dynamoDbServiceUrl, 
            Amazon.RegionEndpoint? remoteDynamoDbRegion, 
            Func<(string, string)>? getAuthenticatedUser, 
            ILoggerObserver observer
        )
        {
            _invitesSourceEmailAddress = invitesSourceEmailAddress!;
            _websiteUrl = websiteUrl!;
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

                if (_getAuthenticatedUser == null)
                {
                    _observer.OnWarning("Enail send skipped in Local Dev Emvironment", context);
                    return;                    
                }

                var authenticatedUser = _getAuthenticatedUser?.Invoke();
                var conversationUrl = new Uri(_websiteUrl, $"conversations/{req.ConversationPK}");
                
                var emailBody = $@"Hi {req.InviteeName},

    {authenticatedUser?.Name ?? req.SenderUsername} started a conversation on WiseWords, and has invited you to participate.

    Follow this link to view the conversation: {conversationUrl}.
    When you post a comment, you will be asked to register.

    WiseWords is a platform for engaging in productive discussions.
    Learn more about the WiseWords here: {_websiteUrl}.

    For any question, reply to this email or contact {authenticatedUser?.Name ?? req.SenderUsername} here in cc.

Ciao!
The WiseWords Team";

                using var sesClient = new AmazonSimpleEmailServiceClient();
                var sendRequest = new SendEmailRequest
                {
                    Source = _invitesSourceEmailAddress.ToString(),
                    Destination = new Destination
                    {
                        ToAddresses = [req.InviteeEmail],
                        CcAddresses = authenticatedUser?.Email != null ? [authenticatedUser.Value.Email] : []
                    },
                    Message = new Message
                    {
                        Subject = new Content($"{req.SenderUsername} invited you to join a conversation on WiseWords"),
                        Body = new Body { Text = new Content(emailBody) }
                    }
                };

                await sesClient.SendEmailAsync(sendRequest);

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