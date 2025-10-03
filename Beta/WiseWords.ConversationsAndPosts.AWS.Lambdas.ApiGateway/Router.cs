using System.Net;
using System.Text.Json;
using System.Web;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway;

public class Router
{
    private readonly IFunctions _lambdaFunctions;
    private readonly ILoggerObserver _routingObserver;
    private readonly ILoggerObserver _forwardingObserver;
    private readonly string _allowedOrigin;
    private APIGatewayProxyRequest? _currentRequest;

    public Router(IFunctions lambdaFunctions, ILoggerObserver routingObserver, ILoggerObserver forwardingObserver, string allowedOrigin)
    {
        _lambdaFunctions = lambdaFunctions;
        _routingObserver = routingObserver;
        _forwardingObserver = forwardingObserver;
        _allowedOrigin = allowedOrigin;
    }

    public Router()
    {
        var environmentInfo = new DataStore.Configuration.Loader().GetEnvironmentVariables();
        Func<(string userName, string userEmail)>? _getAuthenticatedUser = environmentInfo.Cognito == null ? null : GetAuthenticatedUserFromCognitoAuthorizerClaims;

        _lambdaFunctions = new Functions(
            environmentInfo.DynamoDbServiceLocalContainerUrl,
            environmentInfo.AWS.Region,
            _getAuthenticatedUser);

        _routingObserver = new LoggerObserver("Api Gateway Routing");
        _forwardingObserver = new LoggerObserver("Api Gateway Forwarding");
        _allowedOrigin = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN") ?? "*";

    }

    public async Task<APIGatewayProxyResponse> Dispatch(APIGatewayProxyRequest request, ILambdaContext context)
    {

        _routingObserver.OnStart($"HTTP Request Router={nameof(Dispatch)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        _currentRequest = request;

        try
        {
            var response = request.HttpMethod switch
            {
                "POST" => await (request.Path switch
                {
                    "/conversations" => ForwardPostConversations(request, context),
                    "/conversations/drilldown" => ForwardPostConversationsDrillDownPost(request, context),
                    "/conversations/comment" => ForwardPostConversationsComment(request, context),
                    "/conversations/conclusion" => ForwardPostConversationsConclusion(request, context),
                   "/conversations/invite" => ForwardSendConversationInviteEmail(request, context),
                    _ => Task.FromResult(CreateResponse(HttpStatusCode.NotFound, "Not found"))
                }),

                "GET" => await (request.Path switch
                {
                    "/conversations" => ForwardGetConversations(request, context),
                    _ when request.Path.StartsWith("/conversations/") && request.Path.EndsWith("/posts")
                                     => ForwardGetConversationPosts(request, context),
                    _ => Task.FromResult(CreateResponse(HttpStatusCode.NotFound, "Not found"))
                }),

                "DELETE" => await (request.Path switch
                {
                    _ when request.Path.StartsWith("/conversations/") &&
                          !request.Path.EndsWith("/posts")
                                    => ForwardDeleteConversations(request, context),
                    _ => Task.FromResult(CreateResponse(HttpStatusCode.NotFound, "Not found"))
                }),

                "OPTIONS" => CreateResponse(HttpStatusCode.OK, ""),

                _ => CreateResponse(HttpStatusCode.MethodNotAllowed, "Method not allowed"),
            };

            _routingObserver.OnSuccess($"HTTP Request Router={nameof(Dispatch)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);


            return response;

        }
        catch (ArgumentException ex)
        {
            _routingObserver.OnFailure($"HTTP Request Router={nameof(Dispatch)}", context, ex);

            return CreateResponse(HttpStatusCode.BadRequest, $"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _routingObserver.OnFailure($"HTTP Request Router={nameof(Dispatch)}", context, ex);

            return CreateResponse(HttpStatusCode.BadRequest, $"Invalid operation: {ex.Message}");
        }
        catch (OperationCanceledException ex)
        {
            _routingObserver.OnFailure($"HTTP Request Router={nameof(Dispatch)}", context, ex);

            return CreateResponse(HttpStatusCode.RequestTimeout, $"Request cancelled: {ex.Message}");
        }
        catch (Amazon.Runtime.AmazonServiceException ex)
        {
            _routingObserver.OnFailure($"HTTP Request Router={nameof(Dispatch)}", context, ex);

            return CreateResponse(HttpStatusCode.ServiceUnavailable, $"Amazon service error: {ex.Message}");
        }
        catch (Exception ex)
        {
            _routingObserver.OnFailure($"HTTP Request Router={nameof(Dispatch)}", context, ex);

            return CreateResponse(HttpStatusCode.InternalServerError, $"Internal server error: {{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}");
        }
        finally
        {
            _currentRequest = null;
        }
    }


    private async Task<APIGatewayProxyResponse> ForwardPostConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out CreateNewConversationRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardPostConversations)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.CreateNewConversationHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);
        
        var locationAndContentTypeHeaders = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString("CONVO#") + validLambdaHandlerRequestOrNull.NewGuid.ToString()}/posts" },
                                                                             { "Content-Type", "application/json; charset=utf-8" } };
        return CreateResponse(HttpStatusCode.Created, result, locationAndContentTypeHeaders);
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var upsatedAtYearValidationResult = ValidateUpdatedAtYearQueryStringRequest(request);
        if (!upsatedAtYearValidationResult.IsValid)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code {(int)upsatedAtYearValidationResult.ErrorStatusCode}, HTTP error message {upsatedAtYearValidationResult.ErrorMessage}");

            return CreateResponse(upsatedAtYearValidationResult.ErrorStatusCode, upsatedAtYearValidationResult.ErrorMessage);
        }

        var filterByAuthorValidationResult = ValidateOptionalFilterByAuthorQueryStringRequest(request);
        if (!filterByAuthorValidationResult.IsValid)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code {(int)filterByAuthorValidationResult.ErrorStatusCode}, HTTP error message {filterByAuthorValidationResult.ErrorMessage}");

            return CreateResponse(filterByAuthorValidationResult.ErrorStatusCode, filterByAuthorValidationResult.ErrorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationsRequest
        {
            UpdatedAtYear = upsatedAtYearValidationResult.Year,
            FilterByAuthor = filterByAuthorValidationResult.Author
        };

        var result = await _lambdaFunctions.RetrieveConversationsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(result), new Dictionary<string, string> { { "Content-Type", "application/json; charset=utf-8" } });
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversationPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length != 3 || segments[0] != "conversations" || segments[2] != "posts")
        {
            var errorStatusCode = HttpStatusCode.BadRequest;
            var errorMessage = $"Invalid path format. Path:{request.Path}";

            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}", context,  $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationPostsRequest
        {
            ConversationPK = SafeUrlDecode(segments[1])
        };

        var result = await _lambdaFunctions.RetrieveConversationPostsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(result), new Dictionary<string, string> { { "Content-Type", "application/json; charset=utf-8" } });

    }

    private async Task<APIGatewayProxyResponse> ForwardDeleteConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length != 2 || segments[0] != "conversations")
        {
            var errorStatusCode = HttpStatusCode.BadRequest;
            var errorMessage = $"Invalid path format. Path:{request.Path}";

            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}", context,  $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var deleteConversationRequest = new DeleteConversationRequest
        {
            ConversationPK = SafeUrlDecode(segments[1])
        };
        
        try
        {
            await _lambdaFunctions.AdministrativeNonAtomicDeleteConversationAndPostsHandler(deleteConversationRequest, context);

            _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            return CreateResponse(HttpStatusCode.NoContent, string.Empty);
        }
        catch (InvalidOperationException)
        {
            var errorStatusCode = HttpStatusCode.NotFound;
            var errorMessage = "Item not found";

            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);

        }
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsDrillDownPost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendDrillDownPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendDrillDownPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationAndContentTypeHeaders = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" },
                                                                             { "Content-Type", "application/json; charset=utf-8" } };

        return CreateResponse(HttpStatusCode.Created, result, locationAndContentTypeHeaders);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendCommentPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendCommentPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationAndContentTypeHeaders = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" },
                                                                             { "Content-Type", "application/json; charset=utf-8" } };
        return CreateResponse(HttpStatusCode.Created, result, locationAndContentTypeHeaders);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsConclusion(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendConclusionPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendConclusionPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationAndContentTypeHeaders = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" },
                                                                             { "Content-Type", "application/json; charset=utf-8" } };
        return CreateResponse(HttpStatusCode.Created, result, locationAndContentTypeHeaders);
    }

    private async Task<APIGatewayProxyResponse> ForwardSendConversationInviteEmail(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardSendConversationInviteEmail)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out SendConversationInviteRequest? validRequestOrNull, out HttpStatusCode errorCode, out string errorMessage);

        if (validRequestOrNull == null)
        {
            _forwardingObserver.OnFailure($"HTTP Request Forwarding={nameof(ForwardSendConversationInviteEmail)}", context, $"HTTP error code {(int)errorCode}, HTTP error message {errorMessage}");
            return CreateResponse(errorCode, errorMessage);
        }

        try
        {
            await _lambdaFunctions.SendConversationInviteEmailHandler(validRequestOrNull, context);

            _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardSendConversationInviteEmail)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            // 202 Accepted with minimal JSON ack
            var ack = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["Status"] = "QUEUED",
                ["ConversationPK"] = validRequestOrNull.ConversationPK,
                ["SenderUsername"] = validRequestOrNull.SenderUsername,
                ["InviteeEmail"] = validRequestOrNull.InviteeEmail
            });

            return CreateResponse(HttpStatusCode.Accepted, ack, new Dictionary<string, string> { { "Content-Type", "application/json; charset=utf-8" } });
        }
        catch (ArgumentException ex)
        {
            return CreateResponse(HttpStatusCode.BadRequest, ex.Message);
        }
        catch (System.Security.SecurityException ex)
        {
            return CreateResponse(HttpStatusCode.Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return CreateResponse(HttpStatusCode.NotFound, ex.Message);
        }
//        catch (RateLimitExceededException)
//        {
//            return CreateResponse((HttpStatusCode)429, "Too Many Requests");
//        }
//        catch (EmailProviderUnavailableException)
//        {
//            return CreateResponse(HttpStatusCode.BadGateway, "Upstream email provider failure");
//        }
        catch (Amazon.Runtime.AmazonServiceException)
        {
            return CreateResponse(HttpStatusCode.ServiceUnavailable, "Service unavailable");
        }
    }
    

    private APIGatewayProxyResponse CreateResponse(HttpStatusCode statusCode, string body)
        => CreateResponse(statusCode, body, new Dictionary<string, string>());
    private APIGatewayProxyResponse CreateResponse(HttpStatusCode statusCode, string body, Dictionary<string, string> additionalHeaders)
    {
        var headers = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", _allowedOrigin },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
            { "Access-Control-Allow-Methods", "OPTIONS,POST,GET,DELETE" },
            { "Access-Control-Allow-Credentials", "true" }
        };

        foreach (var keyVal in additionalHeaders)
        {
            headers[keyVal.Key] = keyVal.Value;
        }

        return new APIGatewayProxyResponse
        {
            StatusCode = (int)statusCode,
            Body = body,
            Headers = headers

        };
    }

    private void TryToSerialise<T>(string body, out T? validRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage)
    {

        if (string.IsNullOrEmpty(body))
        {
            validRequestOrNull = default;
            errorStatusCode = HttpStatusCode.BadRequest;
            errorMessage = "Empty request body.";

            return;
        }

        try
        {
            validRequestOrNull = JsonSerializer.Deserialize<T>(body);
        }
        catch (Exception ex)
        {
            errorStatusCode = HttpStatusCode.BadRequest;
            errorMessage = $"Invalid request body. {{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}";
            validRequestOrNull = default;

            return;

        }

        errorStatusCode = HttpStatusCode.OK;
        errorMessage = string.Empty;
    }

    private (bool IsValid, int Year, HttpStatusCode ErrorStatusCode, string ErrorMessage) ValidateUpdatedAtYearQueryStringRequest(APIGatewayProxyRequest request)
    {
        string? yearStr;

        if (request.QueryStringParameters is null || ! request.QueryStringParameters.ContainsKey("updatedAtYear"))
        {
            return (false, 0, HttpStatusCode.BadRequest, "Missing updatedAtYear. It must be included in the query string.");

        }

        yearStr = request.QueryStringParameters?["updatedAtYear"];


        if (string.IsNullOrEmpty(yearStr))
        {
            return (false, 0, HttpStatusCode.BadRequest, "Empty updatedAtYear. Must be a valid integer.");
        }

        if (!int.TryParse(yearStr, out var year))
        {
            return (false, 0, HttpStatusCode.BadRequest, "Invalid updatedAtYear. Must be a valid integer.");
        }

        const int minYear = 1970;
        const int maxYear = 9999;

        if (year < minYear || maxYear < year)
        {
            return (false, 0, HttpStatusCode.BadRequest, $"Invalid updatedAtYear value '{year}'. Must be between {minYear} and {maxYear}.");
        }

        return (true, year, HttpStatusCode.OK, string.Empty);
    }

    private static (bool IsValid, string Author, HttpStatusCode ErrorStatusCode, string ErrorMessage) ValidateOptionalFilterByAuthorQueryStringRequest(APIGatewayProxyRequest request)
    {
        string? authorStr;

        if (false == request.QueryStringParameters?.ContainsKey("filterByAuthor"))
        {
            return (true, string.Empty, HttpStatusCode.OK, string.Empty);

        }

        authorStr = request.QueryStringParameters?["filterByAuthor"];


        if (string.IsNullOrEmpty(authorStr))
        {
            return (false, string.Empty, HttpStatusCode.BadRequest, "Empty filterByAuthor. Must be a not empty username.");
        }

        return (true, authorStr, HttpStatusCode.OK, string.Empty);
    }

    private  (string userName, string userEmail) GetAuthenticatedUserFromCognitoAuthorizerClaims()
    {
        var userName = string.Empty;
        var userEmail = string.Empty;
        if (_currentRequest?.RequestContext?.Authorizer?.Claims is System.Collections.Generic.IDictionary<string, string> claims)
        {

            if (claims.TryGetValue("email", out var email) && !string.IsNullOrWhiteSpace(email))
            {
                userEmail = email;
            }

            if (claims.TryGetValue("preferred_username", out var preferred) && !string.IsNullOrWhiteSpace(preferred))
                userName = preferred;
            else if (!string.IsNullOrWhiteSpace(email))
                userName = email;
            else if (claims.TryGetValue("cognito:username", out var cognitoUser) && !string.IsNullOrWhiteSpace(cognitoUser))
                userName = cognitoUser;
            else if (claims.TryGetValue("name", out var name) && !string.IsNullOrWhiteSpace(name))
                userName = name;
        }

        return (userName, userEmail);
    }

    private static string SafeUrlDecode(string potentiallyUrlEncodedString)
    {
        // Based on the deployment environment and the web server, a url encoded paramater like Conversaton PK could be received already decoded or not.
        // HttpUtility.UrlDecode handles both encoded and already-decoded strings safely

        if (string.IsNullOrEmpty(potentiallyUrlEncodedString))
            return potentiallyUrlEncodedString;
        
        try
        {
            string decoded = HttpUtility.UrlDecode(potentiallyUrlEncodedString);
            
            return decoded;
        }
        catch
        {
            return potentiallyUrlEncodedString;
        }
    }

}
