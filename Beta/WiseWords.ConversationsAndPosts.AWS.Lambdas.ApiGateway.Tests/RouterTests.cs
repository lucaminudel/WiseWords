using Xunit;

using System;
using System.Net;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;

using WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway;
using WiseWords.ConversationsAndPosts.AWS.Lambdas;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

public class RouterTests
{
    private readonly FunctionsMock _testFunctions;
    private readonly Router _router;
    private readonly ILambdaContext _context;

    public RouterTests()
    {
        _testFunctions = new FunctionsMock();
        
        // Create a test implementation of Functions
        _router = new Router(_testFunctions, new LambdaLoggerStub(), new LambdaLoggerStub());
        _context = new LambdaContextStub { AwsRequestId = "test-request-id" };
    }

    [Theory]
    [InlineData("conversations/CONVO%23abc-def-123/posts", "CONVO#abc-def-123")] // Encoded # as %23
    [InlineData("conversations/CONVO#abc-def-123/posts", "CONVO#abc-def-123")]  // Already decoded #
    [InlineData("conversations/CONVO%23%24%26%2B%2C%2F%3A%3B%3D%3F%40%23%5B%5D/posts", "CONVO#$&+,/:;=?@#[]")] // Complex encoded
    public async Task Dispatch_GetConversationPosts_DecodesConversationPK(string path, string expectedDecodedPK)
    {
        // Arrange
        var request = new APIGatewayProxyRequest
        {
            HttpMethod = "GET",
            Path = $"/{path}",
            PathParameters = new Dictionary<string, string>(),
            QueryStringParameters = new Dictionary<string, string>()
        };

        // Act
        await _router.Dispatch(request, _context);

        // Assert
        Assert.Equal(expectedDecodedPK, _testFunctions.LastConversationPK);
    }

    [Theory]
    [InlineData("conversations/CONVO%23abc-def-123", "CONVO#abc-def-123")]       // Encoded # as %23
    [InlineData("conversations/CONVO#abc-def-123", "CONVO#abc-def-123")]        // Already decoded #
    [InlineData("conversations/CONVO%23%24%26%2B%2C%2F%3A%3B%3D%3F%40%23%5B%5D", "CONVO#$&+,/:;=?@#[]")] // Complex encoded
    public async Task Dispatch_DeleteConversation_DecodesConversationPK(string path, string expectedDecodedPK)
    {
        // Arrange
        var request = new APIGatewayProxyRequest
        {
            HttpMethod = "DELETE",
            Path = $"/{path}",
            PathParameters = new Dictionary<string, string>(),
            QueryStringParameters = new Dictionary<string, string>()
        };

        // Act
        await _router.Dispatch(request, _context);

        // Assert
        Assert.Equal(expectedDecodedPK, _testFunctions.LastConversationPK);
    }
}
