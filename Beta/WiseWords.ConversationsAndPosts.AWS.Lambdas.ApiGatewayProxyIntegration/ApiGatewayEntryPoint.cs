using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration;

public class ApiGatewayEntryPoint
{
    private readonly Functions _lambdaFunctions;
    private readonly ILoggerObserver _routingObserver;

    private readonly ILoggerObserver _forwardingObserver;

    public ApiGatewayEntryPoint()
    {
        var dynamoDbServiceUrl = Environment.GetEnvironmentVariable("DYNAMODB_SERVICE_URL") ?? "http://localhost:8000";
        _lambdaFunctions = new Functions(new Uri(dynamoDbServiceUrl));
        _routingObserver = new LoggerObserver("Api Gateway Routing");
        _forwardingObserver = new LoggerObserver("Api Gateway Forwarding");
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
                    "/conversations/delete" => ForwardPostConversationsDelete(request, context),
                    "/conversations/drilldown" => ForwardPostConversationsDrillDownPost(request, context),
                    "/conversations/comment" => ForwardPostConversationsComment(request, context),
                    "/conversations/conclusion" => ForwardPostConversationsConclusion(request, context),
                    _ => Task.FromResult(CreateResponse(404, "Not found"))
                }),

                "GET" => await (request.Path switch
                {
                    "/conversations" => ForwardGetConversations(request, context),
                    _ when request.Path.StartsWith("/conversations/") && request.Path.EndsWith("/posts")
                                     => ForwardGetConversationPosts(request, context),
                    _ => Task.FromResult(CreateResponse(404, "Not found"))
                }),

                "OPTIONS" => CreateResponse(200, ""),

                _ => CreateResponse(405, "Method not allowed"),
            };

            _routingObserver.OnSuccess($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);


            return response;

        }
        catch (ArgumentException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(400, $"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(400, $"Invalid operation: {ex.Message}");
        }
        catch (OperationCanceledException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(408, $"Request cancelled: {ex.Message}");
        }
        catch (Amazon.Runtime.AmazonServiceException ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(503, $"Amazon service error: {ex.Message}");
        }
        catch (Exception ex)
        {
            _routingObserver.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(500, $"Internal server error: {{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}");
        }
    }


    private async Task<APIGatewayProxyResponse> ForwardPostConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out CreateNewConversationRequest? validLambdaHandlerRequestOrNull, out int errorNumber, out string errorMessage);

        if (validLambdaHandlerRequestOrNull == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversations)}", context, $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.CreateNewConversationHandler(validLambdaHandlerRequestOrNull, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);
        
        var locationHeader = new Dictionary<string, string> { { "Location", $"/conversations/{Uri.EscapeDataString("CONVO#") + validLambdaHandlerRequestOrNull.NewGuid.ToString()}/posts" } };
        return CreateResponse(201, result, locationHeader);
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var upsatedAtYearValidationResult = ValidateUpdatedAtYearQueryStringRequest(request);
        if (!upsatedAtYearValidationResult.IsValid)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code 400, HTTP error messag {upsatedAtYearValidationResult.ErrorMessage}");

            return CreateResponse(400, upsatedAtYearValidationResult.ErrorMessage);
        }

        var filterByAuthorValidationResult = ValidateOptonalFilterByAuthorQueryStringRequest(request);
        if (!filterByAuthorValidationResult.IsValid)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversations)}", context, $"HTTP error code 400, HTTP error messag {filterByAuthorValidationResult.ErrorMessage}");

            return CreateResponse(400, filterByAuthorValidationResult.ErrorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationsRequest
        {
            UpdatedAtYear = upsatedAtYearValidationResult.Year,
            FilterByAuthor = filterByAuthorValidationResult.Author
        };

        var result = await _lambdaFunctions.RetrieveConversationsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, JsonSerializer.Serialize(result));
    }

    private async Task<APIGatewayProxyResponse> ForwardGetConversationPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length != 3 || segments[0] != "conversations" || segments[2] != "posts")
        {
            var errorNumber = 400;
            var errorMessage = $"Invalid path format. Path:{request.Path}";

            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}", context,  $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationPostsRequest
        {
            ConversationPK = segments[1]
        };

        var result = await _lambdaFunctions.RetrieveConversationPostsHandler(lambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, JsonSerializer.Serialize(result));

    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsDelete(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsDelete)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out DeleteConversationRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsDelete)}", context, $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        await _lambdaFunctions.AdministrativeNonAtomicDeleteConversationAndPostsHandler(nullOrValidLambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsDelete)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, "Deleted");
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsDrillDownPost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendDrillDownPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}", context, $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendDrillDownPostHandler(nullOrValidLambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsDrillDownPost)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendCommentPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}", context, $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendCommentPostHandler(nullOrValidLambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsComment)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> ForwardPostConversationsConclusion(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _forwardingObserver.OnStart($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out AppendConclusionPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            _forwardingObserver.OnError($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}", context, $"HTTP error code {errorNumber}, HTTP error messag {errorMessage}");

            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendConclusionPostHandler(nullOrValidLambdaHandlerRequest, context);

        _forwardingObserver.OnSuccess($"HTTP Request Forwarding={nameof(ForwardPostConversationsConclusion)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

        return CreateResponse(200, result);
    }

    private APIGatewayProxyResponse CreateResponse(int statusCode, string body)
        => CreateResponse(statusCode, body, new Dictionary<string, string>());
    private APIGatewayProxyResponse CreateResponse(int statusCode, string body, Dictionary<string, string> additionalHeaders)
    {
        var headers = new Dictionary<string, string>
        {
            // In production replace the * in the header below with an url to only allow access
            // to the API from web pages from trusted domains
            { "Access-Control-Allow-Origin", "*" },
            { "Access-Control-Allow-Headers", "Content-Type" },
            { "Access-Control-Allow-Methods", "OPTIONS,POST,GET" }
        };

        foreach (var keyVal in additionalHeaders)
        {
            headers[keyVal.Key] = keyVal.Value;
        }

        return new APIGatewayProxyResponse
        {
            StatusCode = statusCode,
            Body = body,
            Headers = headers

        };
    }

    private void TryToSerialise<T>(string body, out T? nullOrValidRequest, out int errorNumber, out string errorMessage)
    {

        if (string.IsNullOrEmpty(body))
        {
            nullOrValidRequest = default;
            errorNumber = 400;
            errorMessage = "Empty request body.";

            return;
        }

        try
        {
            nullOrValidRequest = JsonSerializer.Deserialize<T>(body);
        }
        catch (Exception ex)
        {
            errorNumber = 400;
            errorMessage = $"Invalid request body. {{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}";
            nullOrValidRequest = default;

            return;

        }

        errorNumber = 0;
        errorMessage = string.Empty;
    }

    private (bool IsValid, int Year, string ErrorMessage) ValidateUpdatedAtYearQueryStringRequest(APIGatewayProxyRequest request)
    {
        string? yearStr;

        if (false == request.QueryStringParameters?.ContainsKey("updatedAtYear"))
        {
            return (false, 0, "Missing updatedAtYear. It must be included in the query string.");

        }

        yearStr = request.QueryStringParameters?["updatedAtYear"];


        if (string.IsNullOrEmpty(yearStr))
        {
            return (false, 0, "Empty updatedAtYear. Must be a valid integer.");
        }

        if (!int.TryParse(yearStr, out var year))
        {
            return (false, 0, "Invalid updatedAtYear. Must be a valid integer.");
        }

        const int minYear = 1970;
        const int maxYear = 9999;

        if (year < minYear || maxYear < year)
        {
            return (false, 0, $"Invalid updatedAtYear value '{year}'. Must be between {minYear} and {maxYear}.");
        }

        return (true, year, "");
    }

    private (bool IsValid, string Author, string ErrorMessage) ValidateOptonalFilterByAuthorQueryStringRequest(APIGatewayProxyRequest request)
    {
        string? authorStr;

        if (false == request.QueryStringParameters?.ContainsKey("filterByAuthor"))
        {
            return (true, string.Empty, string.Empty);

        }

        authorStr = request.QueryStringParameters?["filterByAuthor"];


        if (string.IsNullOrEmpty(authorStr))
        {
            return (false, string.Empty, "Empty filterByAuthor. Must be a not empty username.");
        }

        return (true, authorStr, string.Empty);
    }

}
