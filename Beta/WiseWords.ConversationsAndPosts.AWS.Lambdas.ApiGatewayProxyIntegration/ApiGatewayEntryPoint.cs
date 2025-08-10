using System.Net;
using System.Text.Json;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration;

public class ApiGatewayEntryPoint
{
    private readonly Functions _lambdaFunctions;
    private readonly ILoggerObserver _routingObserver;

    private readonly ILoggerObserver _forwardingObserver;

    public ApiGatewayEntryPoint()
    : this(new Functions(new Uri(new DataStore.Configuration.Loader().GetEnvironmentVariables().DynamoDbServiceLocalContainerUrl)),
            new LoggerObserver("Api Gateway Routing"), new LoggerObserver("Api Gateway Forwarding"))
    {
    }

    public ApiGatewayEntryPoint(Functions lambdaFunctions, LoggerObserver routingObserver, LoggerObserver forwardingObserver)
    {
        _lambdaFunctions = lambdaFunctions;
        _routingObserver = routingObserver;
        _forwardingObserver = forwardingObserver;        
    }
    public async Task<APIGatewayProxyResponse> RouteHttpRequestToLambda(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _routingObserver.OnStart($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

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

            _routingObserver.OnSuccess($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);


            return response;

        }
        catch (ArgumentException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(HttpStatusCode.BadRequest, $"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(HttpStatusCode.BadRequest, $"Invalid operation: {ex.Message}");
        }
        catch (OperationCanceledException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(HttpStatusCode.RequestTimeout, $"Request cancelled: {ex.Message}");
        }
        catch (Amazon.Runtime.AmazonServiceException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(HttpStatusCode.ServiceUnavailable, $"Amazon service error: {ex.Message}");
        }
        catch (Exception ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(HttpStatusCode.InternalServerError, $"Internal server error: {{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}");
        }
    }


    private async Task<APIGatewayProxyResponse> ForwardPostConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out CreateNewConversationRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversations)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.CreateNewConversationHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);
        
        var locationHeader = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString("CONVO#") + validLambdaHandlerRequestOrNull.NewGuid.ToString()}/posts" } };
        return CreateResponse(HttpStatusCode.Created, result, locationHeader);
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var upsatedAtYearValidationResult = ValidateUpdatedAtYearQueryStringRequest(request);
        if (!upsatedAtYearValidationResult.IsValid)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code {(int)upsatedAtYearValidationResult.ErrorStatusCode}, HTTP error message {upsatedAtYearValidationResult.ErrorMessage}");

            return CreateResponse(upsatedAtYearValidationResult.ErrorStatusCode, upsatedAtYearValidationResult.ErrorMessage);
        }

        var filterByAuthorValidationResult = ValidateOptonalFilterByAuthorQueryStringRequest(request);
        if (!filterByAuthorValidationResult.IsValid)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code {(int)filterByAuthorValidationResult.ErrorStatusCode}, HTTP error message {filterByAuthorValidationResult.ErrorMessage}");

            return CreateResponse(filterByAuthorValidationResult.ErrorStatusCode, filterByAuthorValidationResult.ErrorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationsRequest
        {
            UpdatedAtYear = upsatedAtYearValidationResult.Year,
            FilterByAuthor = filterByAuthorValidationResult.Author
        };

        var result = await _lambdaFunctions.RetrieveConversationsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(result));
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversationPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length != 3 || segments[0] != "conversations" || segments[2] != "posts")
        {
            var errorStatusCode = HttpStatusCode.BadRequest;
            var errorMessage = $"Invalid path format. Path:{request.Path}";

            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}", context,  $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationPostsRequest
        {
            ConversationPK = segments[1]
        };

        var result = await _lambdaFunctions.RetrieveConversationPostsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(result));

    }

    private async Task<APIGatewayProxyResponse> ForwardDeleteConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length != 2 || segments[0] != "conversations")
        {
            var errorStatusCode = HttpStatusCode.BadRequest;
            var errorMessage = $"Invalid path format. Path:{request.Path}";

            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}", context,  $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var deleteConversationRequest = new DeleteConversationRequest
        {
            ConversationPK = segments[1]
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

            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardDeleteConversations)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);

        }
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsDrillDownPost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendDrillDownPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendDrillDownPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationHeader = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" } };

        return CreateResponse(HttpStatusCode.Created, result, locationHeader);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendCommentPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendCommentPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationHeader = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" } };
        return CreateResponse(HttpStatusCode.Created, result, locationHeader);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsConclusion(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendConclusionPostRequest? validLambdaHandlerRequestOrNull, out HttpStatusCode errorStatusCode, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}", context, $"HTTP error code {(int)errorStatusCode}, HTTP error message {errorMessage}");

            return CreateResponse(errorStatusCode, errorMessage);
        }

        var result = await _lambdaFunctions.AppendConclusionPostHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        var locationHeader = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString(validLambdaHandlerRequestOrNull.ConversationPK)}/posts" } };
        return CreateResponse(HttpStatusCode.Created, result, locationHeader);
    }

    private APIGatewayProxyResponse CreateResponse(HttpStatusCode statusCode, string body)
        => CreateResponse(statusCode, body, new Dictionary<string, string>());
    private APIGatewayProxyResponse CreateResponse(HttpStatusCode statusCode, string body, Dictionary<string, string> additionalHeaders)
    {
        var headers = new Dictionary<string, string>
        {
            // In production replace the * in the header below with an url to only allow access
            // to the API from web pages from trusted domains
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type" },
            { "Access-Control-Allow-Methods", "OPTIONS,POST,GET, DELETE" }
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

    private (bool IsValid, string Author, HttpStatusCode ErrorStatusCode, string ErrorMessage) ValidateOptonalFilterByAuthorQueryStringRequest(APIGatewayProxyRequest request)
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

}
