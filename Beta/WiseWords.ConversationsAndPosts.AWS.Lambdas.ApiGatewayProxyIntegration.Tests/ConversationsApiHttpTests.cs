using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.Tests;

public class ConversationsApiHttpTests : IAsyncLifetime
{
    private readonly HttpClient _httpClient;

    private readonly Queue<string> _CleanupConversationPosts = new();

    
    public ConversationsApiHttpTests()
    {
        var Configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.test.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var baseUrl = Configuration["API_GATEWAY_BASE_URL"] ??
        Configuration["ApiGateway:BaseUrl"] ??
        "http://127.0.0.1:3000/";


        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(baseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    #region POST /conversations Tests

    [Fact]
    public async Task POST_Conversations_Should_Create_New_Conversation_Successfully()
    {

        // Act
        var conversationGuid = GetNewConversationGuid();
        var content = new StringContent(CreateNewConversatonRequestJason(conversationGuid, new DateTimeOffset(new DateTime(2025, 12, 12))),
                                        System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{conversationGuid}");
        jsonResult["SK"].Should().Be("METADATA");
        jsonResult["ConvoType"].Should().Be("DILEMMA");
        jsonResult["UpdatedAtYear"].Should().Be("2025");
    }


    [Fact]
    public async Task POST_Conversations_Should_Return_400_For_Invalid_Request_Body()
    {
        // Arrange
        var invalidRequestJson = "{ invalid json }";
        var content = new StringContent(invalidRequestJson, System.Text.Encoding.UTF8, "application/json");

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
        var emptyRequestJson = string.Empty;
        var content = new StringContent(emptyRequestJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Empty request body");
    }

    #endregion

    #region POST /conversations/drilldown Tests

    [Fact]
    public async Task POST_ConversationsDrilldown_Should_Add_Drilldown_Post_Successfully()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, DateTimeOffset.UtcNow),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newDDguid = Guid.NewGuid();
        var content = new StringContent(CreateNewDrillDownPostRequestJason(newDDguid, newConvoGuid, DateTimeOffset.UtcNow),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/drilldown", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
        
        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#DD#{newDDguid}");
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
        var newConvoGuid = GetNewConversationGuid();
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, DateTimeOffset.UtcNow),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newCMguid = Guid.NewGuid();
        var content = new StringContent(CreateNewCommentPostRequestJson(newCMguid, newConvoGuid, DateTimeOffset.UtcNow),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/comment", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#CM#{newCMguid}");
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
        var newConvoGuid = GetNewConversationGuid();
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, DateTimeOffset.UtcNow),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newCCguid = Guid.NewGuid();
        var content = new StringContent(CreateNewConclusionPostRequestJson(newCCguid, newConvoGuid, DateTimeOffset.UtcNow),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/conclusion", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#CC#{newCCguid}");

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


    #region GET /conversations/{id}/posts Tests

    [Fact]
    public async Task GET_ConversationPosts_Should_Return_Posts_Successfully()
    {
        // Arrange 
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = DateTimeOffset.UtcNow;
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, creationTime),
                                                      System.Text.Encoding.UTF8, "application/json"));
        var newDrillDownPostGuid = Guid.NewGuid();
        await _httpClient.PostAsync("/conversations/drilldown",
                                    new StringContent(CreateNewDrillDownPostRequestJason(newDrillDownPostGuid, newConvoGuid, creationTime.AddMinutes(1)),
                                                      System.Text.Encoding.UTF8, "application/json"));

        var newCommentPostGuid = Guid.NewGuid();
        await _httpClient.PostAsync("/conversations/comment",
                                    new StringContent(CreateNewCommentPostRequestJson(newCommentPostGuid, newConvoGuid, creationTime.AddMinutes(2)),
                                                      System.Text.Encoding.UTF8, "application/json"));



        // Act
        var conversationPK = $"CONVO#{newConvoGuid}";
        var response = await _httpClient.GetAsync($"/conversations/{Uri.EscapeDataString(conversationPK)}/posts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var postsList = JsonSerializer.Deserialize<List<string>>(result);
        var posts = postsList!.Select(json => JsonSerializer.Deserialize<Dictionary<string, string>>(json)).ToList();

        posts.Should().NotBeNull();
        posts.Should().HaveCount(3);

        posts[0]!["PK"].Should().Be(conversationPK);
        posts[0]!["SK"].Should().Be($"#CM#{newCommentPostGuid}");

        posts[1]!["PK"].Should().Be(conversationPK);
        posts[1]!["SK"].Should().Be($"#DD#{newDrillDownPostGuid}");

        posts[2]!["PK"].Should().Be(conversationPK);
        posts[2]!["SK"].Should().Be("METADATA");
    }

    [Fact]
    public async Task GET_ConversationPosts_Should_Return_400_For_Invalid_Path_Format()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations//posts");
        //var response = await _httpClient.GetAsync("/conversations/invalid/path/format");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Invalid path format");
    }

    #endregion

    #region GET /conversations Tests

    [Fact]
    public async Task GET_Conversations_Should_Return_Conversations_Successfully()
    {
        // Arrange 
        var updatedAtYear = 2024;
        var filterByUniqueAuthor = "HttpTestUser" + Guid.NewGuid().ToString();
        
        var convo1Guid = GetNewConversationGuid();
        var convo2Guid = GetNewConversationGuid();
        var targetYearTime = new DateTimeOffset(2024, 6, 15, 10, 0, 0, TimeSpan.Zero);
        
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(convo1Guid, filterByUniqueAuthor, targetYearTime),
                                                      System.Text.Encoding.UTF8, "application/json"));
        
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(convo2Guid, filterByUniqueAuthor, targetYearTime.AddHours(1)),
                                                      System.Text.Encoding.UTF8, "application/json"));
        
        var convo3Guid = GetNewConversationGuid();
        var differentYearTime = new DateTimeOffset(2023, 6, 15, 10, 0, 0, TimeSpan.Zero);
        
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(convo3Guid, filterByUniqueAuthor, differentYearTime),
                                                      System.Text.Encoding.UTF8, "application/json"));

        // Act
        var response = await _httpClient.GetAsync($"/conversations?updatedAtYear={updatedAtYear}&filterByAuthor={filterByUniqueAuthor}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        // Verify it's valid JSON array (first step)
        var conversations = JsonSerializer.Deserialize<List<string>>(result);
        conversations.Should().NotBeNull();
        
        // Should return exactly 2 conversations (the ones from 2024)
        conversations.Should().HaveCount(2);
        
        // Verify the correct conversations are returned by checking their PKs (second step)
        var expectedPK1 = $"CONVO#{convo1Guid}";
        var expectedPK2 = $"CONVO#{convo2Guid}";
        var unexpectedPK3 = $"CONVO#{convo3Guid}";
        
        var returnedPKs = conversations.Select(conversationJson => 
        {
            var conversation = JsonSerializer.Deserialize<Dictionary<string, object>>(conversationJson);
            return conversation!["PK"].ToString();
        }).ToList();
        
        returnedPKs.Should().Contain(expectedPK1);
        returnedPKs.Should().Contain(expectedPK2);
        returnedPKs.Should().NotContain(unexpectedPK3);
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
        errorMessage.Should().Contain("Must be between 1970 and 9999.");
    }

    #endregion


    /*


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

    #endregion

    */
    private Guid GetNewConversationGuid()
    {
        var guid = Guid.NewGuid();
        _CleanupConversationPosts.Enqueue($"CONVO#{guid}");

        return guid;
    }


    private static string CreateNewConversatonRequestJason(Guid guid, DateTimeOffset updateAt) => CreateNewConversatonRequestJason(guid, "}HttpTestUser", updateAt);
    private static string CreateNewConversatonRequestJason(Guid guid, string Author, DateTimeOffset updateAt) => $$"""
        {
            "NewGuid": "{{guid}}",
            "ConvoType": 2,
            "Title": "Test Conversation tilet",
            "MessageBody": "This is a test conversation message body",
            "Author": "{{Author}}",
            "UtcCreationTime": "{{updateAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewDrillDownPostRequestJason(Guid newDrillDownPostguid, Guid convoGuid, DateTimeOffset updateAt) => $$"""
        {
            "NewDrillDownGuid": "{{newDrillDownPostguid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "MessageBody": "This is a drill-down post",
            "UtcCreationTime": "{{updateAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewCommentPostRequestJson(Guid newCommentGuid, Guid convoGuid, DateTimeOffset updateAt) => $$"""
        {
            "NewCommentGuid": "{{newCommentGuid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "MessageBody": "This is a comment post",
            "UtcCreationTime": "{{updateAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewConclusionPostRequestJson(Guid newConclusionGuid, Guid convoGuid, DateTimeOffset updateAt) => $$"""
        {
            "NewConclusionGuid": "{{newConclusionGuid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "MessageBody": "This is a conclusion post",
            "UtcCreationTime": "{{updateAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    public async Task InitializeAsync() => await Task.CompletedTask;

    public async Task DisposeAsync()
    {

        while (_CleanupConversationPosts.Count > 0)
        {
            _CleanupConversationPosts.Dequeue();
            //           await _db.AdministrativeNonAtomicDeleteConversationAndPosts(_dbCleanupConversationPosts.Dequeue());
        }

        _httpClient?.Dispose();

    await Task.CompletedTask;

    }
}