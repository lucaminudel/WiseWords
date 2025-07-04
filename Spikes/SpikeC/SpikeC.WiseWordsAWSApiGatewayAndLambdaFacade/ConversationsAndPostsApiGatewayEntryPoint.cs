using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using System.Text.Json;

namespace SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade;

public class ConversationsAndPostsApiGatewayEntryPoint
{
    private readonly ConversationsAndPostsLambdaHandlers _handlers = new();

    public async Task<APIGatewayProxyResponse> RouteHttpRequestToLambda(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            return request.HttpMethod switch
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
        }
        catch (Exception ex)
        {
            return CreateResponse(500, ex.Message);
        }
    }


    private async Task<APIGatewayProxyResponse> RoutePostConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out CreateNewConversationRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _handlers.CreateNewConversationHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> RouteGetConversations(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var updatedAtYearStr = request.QueryStringParameters?["updatedAtYear"];
        var filterByAuthor = request.QueryStringParameters?["filterByAuthor"];

        var validationResult = ValidateUpdatedAtYear(updatedAtYearStr);
        if (!validationResult.IsValid)
        {
            return CreateResponse(400, validationResult.ErrorMessage);
        }

        var lambdaHandlerRequest = new RetrieveConversationsRequest
        {
            UpdatedAtYear = validationResult.Year,
            FilterByAuthor = filterByAuthor ?? string.Empty
        };

        var result = await _handlers.RetrieveConversationsHandler(lambdaHandlerRequest, context);
        return CreateResponse(200, JsonSerializer.Serialize(result));
    }

    private async Task<APIGatewayProxyResponse> RouteGetConversationPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {

        var segments = request.Path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length != 3 || segments[0] != "conversations" || segments[2] != "posts")
        {
            return CreateResponse(400, $"Invalid path format. Path:{request.Path}");
        }

        var lambdaHandlerRequest = new RetrieveConversationPostsRequest
        {
            ConversationPK = segments[1]
        };

        var result = await _handlers.RetrieveConversationPostsHandler(lambdaHandlerRequest, context);
        return CreateResponse(200, JsonSerializer.Serialize(result));

    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsDelete(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out DeleteConversationRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);            
        }

        await _handlers.AdministrativeNonAtomicDeleteConversationAndPostsHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, "Deleted");
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsDrillDownPost(APIGatewayProxyRequest request, ILambdaContext context)
    {

        TryToSerialise(request.Body, out AppendDrillDownPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _handlers.AppendDrillDownPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out AppendCommentPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _handlers.AppendCommentPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private async Task<APIGatewayProxyResponse> RoutePostConversationsConclusion(APIGatewayProxyRequest request, ILambdaContext context)
    {
        TryToSerialise(request.Body, out AppendConclusionPostRequest? nullOrValidLambdaHandlerRequest, out int errorNumber, out string errorMessage);

        if (nullOrValidLambdaHandlerRequest == null)
        {
            return CreateResponse(errorNumber, errorMessage);
        }

        var result = await _handlers.AppendConclusionPostHandler(nullOrValidLambdaHandlerRequest, context);
        return CreateResponse(200, result);
    }

    private (bool IsValid, int Year, string ErrorMessage) ValidateUpdatedAtYear(string? yearStr)
    {
        if (string.IsNullOrEmpty(yearStr))
        {
            return (false, 0, "Empty updatedAtYear. Must be a valid integer..");
        }

        if (!int.TryParse(yearStr, out var year))
        {
            return (false, 0, "Invalid updatedAtYear. Must be a valid integer.");
        }

        const int minYear = 1870;
        const int maxYear = 9999;

        if (year < minYear || year > maxYear)
        {
            return (false, 0, $"Invalid updatedAtYear. Must be between {minYear} and {maxYear}.");
        }

        return (true, year, "");
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

        try
        {
            nullOrValidRequest = JsonSerializer.Deserialize<T>(body);
        }
        catch (Exception ex)
        {
            errorNumber = 400;
            errorMessage = $"Invalid request body.\nAdditional info\n{{Error type:{ex.GetType().ToString}\nError message:{ex.Message}";
            nullOrValidRequest = default;

            return;

        }

        if (nullOrValidRequest == null)
        {
            errorNumber = 400;
            errorMessage = "Empty request body.";

            return;
        }

        errorNumber = 0;
        errorMessage = string.Empty;        
    }

}
