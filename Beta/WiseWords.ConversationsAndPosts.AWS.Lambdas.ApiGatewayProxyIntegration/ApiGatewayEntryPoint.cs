using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration;

public class ApiGatewayEntryPoint
{
    private readonly Functions _lambdaFunctions;
    private readonly ILoggerObserver _observer;


    public ApiGatewayEntryPoint()
    {
        var dynamoDbServiceUrl = Environment.GetEnvironmentVariable("DYNAMODB_SERVICE_URL") ?? "http://localhost:8000";
        _lambdaFunctions = new Functions(new Uri(dynamoDbServiceUrl));
        _observer = new LoggerObserver("Api Gateway");
    }

    public async Task<APIGatewayProxyResponse> RouteHttpRequestToLambda(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _observer.OnStart($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        try
        {
            var response = request.HttpMethod switch
            {
                "POST" => await (request.Path switch
                {
                    "/conversations" => RoutePostConversations(request, context),
                    "/conversations/delete" => RoutePostConversationsDelete(request, context),
                    "/conversations/drilldown" => RoutePostConversationsDrillDownPost(request, context),
                    "/conversations/comment" => RoutePostConversationsComment(request, context),
                    "/conversations/conclusion" => RoutePostConversationsConclusion(request, context),
                    _ => Task.FromResult(CreateResponse(404, "Not found"))
                }),

                "GET" => await (request.Path switch
                {
                    "/conversations" => RouteGetConversations(request, context),
                    _ when request.Path.StartsWith("/conversations/") && request.Path.EndsWith("/posts")
                                     => RouteGetConversationPosts(request, context),
                    _ => Task.FromResult(CreateResponse(404, "Not found"))
                }),

                "OPTIONS" => CreateResponse(200, ""),

                _ => CreateResponse(405, "Method not allowed"),
            };

            _observer.OnSuccess($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            return response;

        }
        catch (Exception ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteHttpRequestToLambda)}", context, ex);

            return CreateResponse(500, $"{{Additional info: Error type:{ex.GetType().ToString}; Error message:{ex.Message}}}");
        }
    }


    private async Task<APIGatewayProxyResponse> RoutePostConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _observer.OnStart($"HTTP Request Router={nameof(RoutePostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        TryToSerialise(request.Body, out CreateNewConversationRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, $"HTTP error code {errorNumber}");

            return CreateResponse(errorNumber, errorMessage);
        }

        try
        {
            var result = await _lambdaFunctions.CreateNewConversationHandler(nullOrValidLambdaHandlerRequest, context);

            _observer.OnSuccess($"HTTP Request Router={nameof(RoutePostConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            return CreateResponse(200, result);
        }
        catch (ArgumentException ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(400, $"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(400, $"Invalid operation: {ex.Message}");
        }
        catch (TaskCanceledException ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(408, $"Request timeout: {ex.Message}");
        }
        catch (JsonException ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(400, $"JSON serialization error: {ex.Message}");
        }
        catch (Amazon.DynamoDBv2.AmazonDynamoDBException ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(503, $"DynamoDB service error: {ex.Message}");
        }
        catch (Exception ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RoutePostConversations)}", context, ex);

            return CreateResponse(500, $"Internal server error: {ex.Message}");
        }
    }

    private async Task<APIGatewayProxyResponse> RouteGetConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _observer.OnStart($"HTTP Request Router={nameof(RouteGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var upsatedAtYearValidationResult = ValidateUpdatedAtYearQueryStringRequest(request);
        if (!upsatedAtYearValidationResult.IsValid)
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteGetConversations)}", context, "HTTP error code 400");

            return CreateResponse(400, upsatedAtYearValidationResult.ErrorMessage);
        }

        var filterByAuthorValidationResult = ValidateFilterByAuthorQueryStringRequest(request);
        if (!filterByAuthorValidationResult.IsValid)
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteGetConversations)}", context, "HTTP error code 400");

            return CreateResponse(400, filterByAuthorValidationResult.ErrorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationsRequest
        {
            UpdatedAtYear = upsatedAtYearValidationResult.Year,
            FilterByAuthor = filterByAuthorValidationResult.Author
        };

        try
        {
            var result = await _lambdaFunctions.RetrieveConversationsHandler(lambdaHandlerRequest, context);

            _observer.OnSuccess($"HTTP Request Router={nameof(RouteGetConversations)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            return CreateResponse(200, JsonSerializer.Serialize(result));
        }
        catch (Exception ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteGetConversations)}", context, ex);

            return CreateResponse(500, $"Internal server error: {ex.Message}");
            
        }
    }

    private async Task<APIGatewayProxyResponse> RouteGetConversationPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {
        _observer.OnStart($"HTTP Request Router={nameof(RouteGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}, {nameof(request.HttpMethod)}={request.HttpMethod},  {nameof(request.Path)}={request.Path}", context);

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length != 3 || segments[0] != "conversations" || segments[2] != "posts")
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteGetConversationPosts)}", context, "HTTP error code 400");

            return CreateResponse(400, $"Invalid path format. Path:{request.Path}");
        }

        var lambdaHandlerRequest = new RetrieveConversationPostsRequest
        {
            ConversationPK = segments[1]
        };

        try
        {
            var result = await _lambdaFunctions.RetrieveConversationPostsHandler(lambdaHandlerRequest, context);

            _observer.OnSuccess($"HTTP Request Router={nameof(RouteGetConversationPosts)}, {nameof(context.AwsRequestId)}={context.AwsRequestId}", context);

            return CreateResponse(200, JsonSerializer.Serialize(result));
        }
        catch (Exception ex)
        {
            _observer.OnError($"HTTP Request Router={nameof(RouteGetConversationPosts)}", context, ex);
            
            return CreateResponse(500, $"Internal server error: {ex.Message}");
        }

    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsDelete(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out DeleteConversationRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        await _lambdaFunctions.AdministrativeNonAtomicDeleteConversationAndPostsHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, "Deleted");
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsDrillDownPost(APIGatewayProxyRequest request, ILambdaContext context)
    {

        TryToSerialise(request.Body, out AppendDrillDownPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendDrillDownPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out AppendCommentPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendCommentPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsConclusion(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out AppendConclusionPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _lambdaFunctions.AppendConclusionPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }


    private APIGatewayProxyResponse CreateResponse(int statusCode, string body)
    {
        return new APIGatewayProxyResponse
        {
            StatusCode = statusCode,
            Body = body,
            Headers = new Dictionary<string, string>
            {
                // In production replace the * in the header below with an url to only allow access
                // to the API from web pages from trusted domains
                { "Access-Control-Allow-Origin", "*" },
                { "Access-Control-Allow-Headers", "Content-Type" },
                { "Access-Control-Allow-Methods", "OPTIONS,POST,GET" }
            }
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

    private (bool IsValid, string Author, string ErrorMessage) ValidateFilterByAuthorQueryStringRequest(APIGatewayProxyRequest request)
    {
        string? authorStr;

        if (false == request.QueryStringParameters?.ContainsKey("filterByAuthor"))
        {
            return (false, string.Empty, "Missing filterByAuthor. It must be included in the query string.");

        }

        authorStr = request.QueryStringParameters?["filterByAuthor"];


        if (string.IsNullOrEmpty(authorStr))
        {
            return (false, string.Empty, "Empty filterByAuthor. Must be a not empty username.");
        }

        return (true, authorStr, string.Empty);
    }

}
