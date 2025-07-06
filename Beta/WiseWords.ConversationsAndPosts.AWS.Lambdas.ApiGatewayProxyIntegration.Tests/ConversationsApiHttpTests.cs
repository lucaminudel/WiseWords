using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.Tests;

public class ConversationsApiHttpTests : IDisposable
{
    private readonly HttpClient _httpClient;
    public ConversationsApiHttpTests()
    {
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(ApiTestConfiguration.BaseUrl),
            Timeout = TimeSpan.FromSeconds(ApiTestConfiguration.TimeoutSeconds)
        };
        //_httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");
    }

    #region POST /conversations Tests

    [Fact]
    public async Task POST_Conversations_Should_Create_New_Conversation_Successfully()
    {
        // Arrange
        var request = new CreateNewConversationRequest
        {
            NewGuid = Guid.NewGuid(),
            ConvoType = DataStore.WiseWordsTable.ConvoTypeEnum.DILEMMA,
            Title = "Test Conversation",
            MessageBody = "This is a test conversation message",
            Author = "TestUser",
            UtcCreationTime = DateTimeOffset.UtcNow
        };

        // Act
        var response = await _httpClient.PostAsJsonAsync("/conversations", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
    }

    /*

    [Fact]
    public async Task POST_Conversations_Should_Return_400_For_Invalid_Request_Body()
    {
        // Arrange
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Invalid request body");
    }

    [Fact]
    public async Task POST_Conversations_Should_Return_400_For_Empty_Request_Body()
    {
        // Arrange
        var content = new StringContent("", System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Empty request body");
    }

    #endregion

    #region POST /conversations/delete Tests

    [Fact]
    public async Task POST_ConversationsDelete_Should_Delete_Conversation_Successfully()
    {
        // Arrange
        var request = new DeleteConversationRequest
        {
            ConversationPK = "test-conversation-id"
        };

        // Act
        var response = await _httpClient.PostAsJsonAsync("/conversations/delete", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().Be("Deleted");
    }

    [Fact]
    public async Task POST_ConversationsDelete_Should_Return_400_For_Invalid_Request()
    {
        // Arrange
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/delete", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region POST /conversations/drilldown Tests

    [Fact]
    public async Task POST_ConversationsDrilldown_Should_Add_Drilldown_Post_Successfully()
    {
        // Arrange
        var request = new AppendDrillDownPostRequest
        {
            ConversationPK = "test-conversation-id",
            ParentPostSK = "test-parent-post-id",
            Author = "TestUser",
            MessageBody = "This is a drill-down post",
            UtcCreationTime = DateTimeOffset.UtcNow
        };

        // Act
        var response = await _httpClient.PostAsJsonAsync("/conversations/drilldown", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
    }

    [Fact]
    public async Task POST_ConversationsDrilldown_Should_Return_400_For_Invalid_Request()
    {
        // Arrange
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/drilldown", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region POST /conversations/comment Tests

    [Fact]
    public async Task POST_ConversationsComment_Should_Add_Comment_Successfully()
    {
        // Arrange
        var request = new AppendCommentPostRequest
        {
            ConversationPK = "test-conversation-id",
            ParentPostSK = "test-parent-post-id",
            NewCommentGuid = Guid.NewGuid(),
            Author = "TestUser",
            MessageBody = "This is a comment",
            UtcCreationTime = DateTimeOffset.UtcNow
        };

        // Act
        var response = await _httpClient.PostAsJsonAsync("/conversations/comment", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
    }

    [Fact]
    public async Task POST_ConversationsComment_Should_Return_400_For_Invalid_Request()
    {
        // Arrange
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/comment", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region POST /conversations/conclusion Tests

    [Fact]
    public async Task POST_ConversationsConclusion_Should_Add_Conclusion_Successfully()
    {
        // Arrange
        var request = new AppendConclusionPostRequest
        {
            ConversationPK = "test-conversation-id",
            ParentPostSK = "test-parent-post-id",
            NewConclusionGuid = Guid.NewGuid(),
            Author = "TestUser",
            MessageBody = "This is a conclusion",
            UtcCreationTime = DateTimeOffset.UtcNow
        };

        // Act
        var response = await _httpClient.PostAsJsonAsync("/conversations/conclusion", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
    }

    [Fact]
    public async Task POST_ConversationsConclusion_Should_Return_400_For_Invalid_Request()
    {
        // Arrange
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/conclusion", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region GET /conversations Tests

    [Fact]
    public async Task GET_Conversations_Should_Return_Conversations_Successfully()
    {
        // Arrange
        var updatedAtYear = 2024;
        var filterByAuthor = "TestUser";

        // Act
        var response = await _httpClient.GetAsync($"/conversations?updatedAtYear={updatedAtYear}&filterByAuthor={filterByAuthor}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        // Verify it's valid JSON array
        var conversations = JsonSerializer.Deserialize<List<string>>(result);
        conversations.Should().NotBeNull();
    }


    [Fact]
    public async Task GET_Conversations_Should_Return_400_For_Missing_UpdatedAtYear()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Empty updatedAtYear");
    }

    [Fact]
    public async Task GET_Conversations_Should_Return_400_For_Invalid_UpdatedAtYear()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations?updatedAtYear=invalid");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Invalid updatedAtYear");
    }

    [Fact]
    public async Task GET_Conversations_Should_Return_400_For_OutOfRange_UpdatedAtYear()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations?updatedAtYear=1800");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Must be between 1870 and 9999");
    }

    #endregion

    #region GET /conversations/{id}/posts Tests

    [Fact]
    public async Task GET_ConversationPosts_Should_Return_Posts_Successfully()
    {
        // Arrange
        var conversationId = "test-conversation-id";

        // Act
        var response = await _httpClient.GetAsync($"/conversations/{conversationId}/posts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        // Verify it's valid JSON array
        var posts = JsonSerializer.Deserialize<List<string>>(result);
        posts.Should().NotBeNull();
    }

    [Fact]
    public async Task GET_ConversationPosts_Should_Return_400_For_Invalid_Path_Format()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations/invalid/path/format");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Invalid path format");
    }

    #endregion

    #region OPTIONS Tests

    [Fact]
    public async Task OPTIONS_Should_Return_200_For_CORS_Preflight()
    {
        // Act
        var request = new HttpRequestMessage(HttpMethod.Options, "/conversations");
        var response = await _httpClient.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify CORS headers
        response.Headers.Should().ContainKey("Access-Control-Allow-Origin");
        response.Headers.Should().ContainKey("Access-Control-Allow-Headers");
        response.Headers.Should().ContainKey("Access-Control-Allow-Methods");
    }

    #endregion

    #region Error Scenario Tests

    [Fact]
    public async Task Should_Return_404_For_Unknown_POST_Endpoint()
    {
        // Arrange
        var content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/unknown-endpoint", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Be("Not found");
    }

    [Fact]
    public async Task Should_Return_404_For_Unknown_GET_Endpoint()
    {
        // Act
        var response = await _httpClient.GetAsync("/unknown-endpoint");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Be("Not found");
    }

    [Fact]
    public async Task Should_Return_405_For_Unsupported_HTTP_Method()
    {
        // Act
        var request = new HttpRequestMessage(HttpMethod.Put, "/conversations");
        var response = await _httpClient.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Be("Method not allowed");
    }

*/
    #endregion


    public void Dispose()
    {
        _httpClient?.Dispose();
    }    
    
}