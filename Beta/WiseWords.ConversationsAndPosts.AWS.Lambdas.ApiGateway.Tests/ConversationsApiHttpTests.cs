using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;
using System.Text.Json;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

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

        var baseUrl = new DataStore.Configuration.Loader().GetEnvironmentVariables().ApiBaseUrl;

        _httpClient = new HttpClient
        {
            BaseAddress = baseUrl,
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
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location.ToString().Should().Be($"/conversations/CONVO%23{conversationGuid}/posts");
        
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{conversationGuid}");
        jsonResult["SK"].Should().Be("METADATA");
        jsonResult["ConvoType"].Should().Be("DILEMMA");
        jsonResult["Title"].Should().Be("Test Conversation tilet");
        jsonResult["MessageBody"].Should().Be("This is a test conversation message body");
        jsonResult["Author"].Should().Be("HttpTestUser");
        jsonResult["UpdatedAt"].Should().Be(new DateTimeOffset(new DateTime(2025, 12, 12)).ToUnixTimeSeconds().ToString());
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
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newDDguid = Guid.NewGuid();
        var content = new StringContent(CreateNewDrillDownPostRequestJason(newDDguid, newConvoGuid, creationTime),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/drilldown", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location.ToString().Should().Be($"/conversations/CONVO%23{newConvoGuid}/posts");
        
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();
        
        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#DD#{newDDguid}");
        jsonResult["Title"].Should().Be("Drill-down");
        jsonResult["MessageBody"].Should().Be("This is a drill-down post");
        jsonResult["Author"].Should().Be("HttpTestUser");
        jsonResult["UpdatedAt"].Should().Be(creationTime.ToUnixTimeSeconds().ToString());
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
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newCMguid = Guid.NewGuid();
        var content = new StringContent(CreateNewCommentPostRequestJson(newCMguid, newConvoGuid, creationTime),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/comment", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location.ToString().Should().Be($"/conversations/CONVO%23{newConvoGuid}/posts");
        
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#CM#{newCMguid}");
        jsonResult["MessageBody"].Should().Be("This is a comment post");
        jsonResult["Author"].Should().Be("HttpTestUser");
        jsonResult["UpdatedAt"].Should().Be(creationTime.ToUnixTimeSeconds().ToString());
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
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));

        // Act
        var newCCguid = Guid.NewGuid();
        var content = new StringContent(CreateNewConclusionPostRequestJson(newCCguid, newConvoGuid, creationTime),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/conclusion", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location.ToString().Should().Be($"/conversations/CONVO%23{newConvoGuid}/posts");
        
        var result = await response.Content.ReadAsStringAsync();
        result.Should().NotBeEmpty();

        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["PK"].Should().Be($"CONVO#{newConvoGuid}");
        jsonResult["SK"].Should().Be($"#CC#{newCCguid}");
        jsonResult["Title"].Should().Be("Conclusion");
        jsonResult["MessageBody"].Should().Be("This is a conclusion post");
        jsonResult["Author"].Should().Be("HttpTestUser");
        jsonResult["UpdatedAt"].Should().Be(creationTime.ToUnixTimeSeconds().ToString());

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
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
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

        var posts = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(result);

        posts.Should().NotBeNull();
        posts.Should().HaveCount(3);

        posts[0]!["PK"].Should().Be(conversationPK);
        posts[0]!["SK"].Should().Be($"#CM#{newCommentPostGuid}");

        posts[1]!["PK"].Should().Be(conversationPK);
        posts[1]!["SK"].Should().Be($"#DD#{newDrillDownPostGuid}");

        posts[2]!["PK"].Should().Be(conversationPK);
        posts[2]!["SK"].Should().Be("METADATA");

        var commentPost = posts.FirstOrDefault(p => p["SK"].Contains("#CM#"));
        commentPost.Should().NotBeNull();
        commentPost!["MessageBody"].Should().Be("This is a comment post");
        commentPost!["Author"].Should().Be("HttpTestUser");
        commentPost!["UpdatedAt"].Should().Be(creationTime.AddMinutes(2).ToUnixTimeSeconds().ToString());

        var drillDownPost = posts.FirstOrDefault(p => p["SK"].Contains("#DD#"));
        drillDownPost.Should().NotBeNull();
        drillDownPost!["Title"].Should().Be("Drill-down");
        drillDownPost!["MessageBody"].Should().Be("This is a drill-down post");
        drillDownPost!["Author"].Should().Be("HttpTestUser");
        drillDownPost!["UpdatedAt"].Should().Be(creationTime.AddMinutes(1).ToUnixTimeSeconds().ToString());

        var metadataPost = posts.FirstOrDefault(p => p["SK"] == "METADATA");
        metadataPost.Should().NotBeNull();
        metadataPost!["Title"].Should().Be("Test Conversation tilet");
        metadataPost!["MessageBody"].Should().Be("This is a test conversation message body");
        metadataPost!["Author"].Should().Be("HttpTestUser");
        metadataPost!["ConvoType"].Should().Be("DILEMMA");
        metadataPost!["UpdatedAtYear"].Should().Be(creationTime.Year.ToString());
        metadataPost!["UpdatedAt"].Should().Be(creationTime.ToUnixTimeSeconds().ToString());
    }

    [Fact]
    public async Task GET_ConversationPosts_Should_Return_400_For_Invalid_Path_Format()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations//posts");

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
        var conversations = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(result);
        conversations.Should().NotBeNull();
        
        // Should return exactly 2 conversations (the ones from 2024)
        conversations.Should().HaveCount(2);
        
        // Verify the correct conversations are returned by checking their PKs (second step)
        var expectedPK1 = $"CONVO#{convo1Guid}";
        var expectedPK2 = $"CONVO#{convo2Guid}";
        var unexpectedPK3 = $"CONVO#{convo3Guid}";
        
        var returnedPKs = conversations.Select(conversation => 
        {
            return conversation!["PK"].ToString();
        }).ToList();
        
        returnedPKs.Should().Contain(expectedPK1);
        returnedPKs.Should().Contain(expectedPK2);
        returnedPKs.Should().NotContain(unexpectedPK3);

        // Verify the correct conversations are returned by checking their content
        var convo1 = conversations.FirstOrDefault(c => c["PK"] == $"CONVO#{convo1Guid}");
        convo1.Should().NotBeNull();
        convo1!["Author"].Should().Be(filterByUniqueAuthor);
        convo1!["Title"].Should().Be("Test Conversation tilet");
        convo1!["ConvoType"].Should().Be("DILEMMA");
        convo1!["UpdatedAtYear"].Should().Be(updatedAtYear.ToString());
        convo1!["UpdatedAt"].Should().Be(targetYearTime.ToUnixTimeSeconds().ToString());

        var convo2 = conversations.FirstOrDefault(c => c["PK"] == $"CONVO#{convo2Guid}");
        convo2.Should().NotBeNull();
        convo2!["Author"].Should().Be(filterByUniqueAuthor);
        convo2!["Title"].Should().Be("Test Conversation tilet");
        convo2!["ConvoType"].Should().Be("DILEMMA");
        convo2!["UpdatedAtYear"].Should().Be(updatedAtYear.ToString());
        convo2!["UpdatedAt"].Should().Be(targetYearTime.AddHours(1).ToUnixTimeSeconds().ToString());
    }


    [Fact]
    public async Task GET_Conversations_Should_Return_400_For_Missing_UpdatedAtYear()
    {
        // Act
        var response = await _httpClient.GetAsync("/conversations");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Missing updatedAtYear");
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

    #region POST /conversations/delete Tests

    [Fact]
    public async Task DELETE_ConversationsDelete_Should_Delete_Conversation_Successfully()
    {
        // Arrange - Create a conversation with posts first
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        
        // Create the conversation
        await _httpClient.PostAsync("/conversations",
                                   new StringContent(CreateNewConversatonRequestJason(newConvoGuid, creationTime),
                                                     System.Text.Encoding.UTF8, "application/json"));
        
        // Add a comment post
        await _httpClient.PostAsync("/conversations/comment",
                                   new StringContent(CreateNewCommentPostRequestJson(Guid.NewGuid(), newConvoGuid, creationTime.AddMinutes(1)),
                                                     System.Text.Encoding.UTF8, "application/json"));
        
        // Add a drill-down post
        await _httpClient.PostAsync("/conversations/drilldown",
                                   new StringContent(CreateNewDrillDownPostRequestJason(Guid.NewGuid(), newConvoGuid, creationTime.AddMinutes(2)),
                                                     System.Text.Encoding.UTF8, "application/json"));

        // Create delete request JSON
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var response = await _httpClient.DeleteAsync($"/conversations/{Uri.EscapeDataString(conversationPK)}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var result = await response.Content.ReadAsStringAsync();
        result.Should().Be(string.Empty);
    }

    [Fact]
    public async Task DELETE_ConversationsDelete_Should_Return_400_For_Invalid_Request()
    {
        // Arrange

        // Act
        var response = await _httpClient.DeleteAsync("/conversations//");

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

    #region POST /conversations/invite Tests

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_202_For_Valid_Request()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var author = "HttpTestUser";
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, author, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var content = new StringContent(CreateSendConversationInviteRequestJson(conversationPK, author, "Invitee", "invitee@example.com"),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        var result = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        result.Should().NotBeEmpty();
        var jsonResult = JsonSerializer.Deserialize<Dictionary<string, string>>(result);
        jsonResult!["Status"].Should().Be("QUEUED");
        jsonResult["ConversationPK"].Should().Be(conversationPK);
        jsonResult["SenderUsername"].Should().Be(author);
        jsonResult["InviteeEmail"].Should().Be("invitee@example.com");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_400_For_Invalid_Request_Body()
    {
        // Arrange
        var invalidRequestJson = "{ invalid json }";
        var content = new StringContent(invalidRequestJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Invalid request body");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_400_For_Empty_Request_Body()
    {
        // Arrange
        var emptyRequestJson = string.Empty;
        var content = new StringContent(emptyRequestJson, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Contain("Empty request body");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_404_For_NonExistent_Conversation()
    {
        // Arrange
        var nonExistentConversationPk = "CONVO#" + Guid.NewGuid().ToString();
        var content = new StringContent(CreateSendConversationInviteRequestJson(nonExistentConversationPk, "HttpTestUser", "Invitee", "invitee@example.com"),
                                         System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_403_For_Sender_Not_Matching_Conversation_Author()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var author = "AuthorA";
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, author, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var content = new StringContent(CreateSendConversationInviteRequestJson(conversationPK, "AuthorB", "Invitee", "invitee@example.com"),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Be("Sender Username 'AuthorB' does not match the Author of the conversation 'AuthorA'.");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_403_For_Sender_Not_Matching_Authenticated_User()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var author = "AuthenticatedUser";
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, author, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var content = new StringContent(CreateSendConversationInviteRequestJson(conversationPK, "DifferentSender", "Invitee", "invitee@example.com"),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().Be("Sender Username 'DifferentSender' does not match the Author of the conversation 'AuthenticatedUser'.");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_400_For_Invalid_InviteeEmail()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var author = "HttpTestUser";
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, author, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var content = new StringContent(CreateSendConversationInviteRequestJson(conversationPK, author, "Invitee", "invalid-email"),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().StartWith("Invitee Email is not a valid email address.");
    }

    [Fact]
    public async Task POST_ConversationsInvite_Should_Return_400_For_Missing_InviteeName()
    {
        // Arrange
        var newConvoGuid = GetNewConversationGuid();
        var creationTime = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var author = "HttpTestUser";
        await _httpClient.PostAsync("/conversations",
                                    new StringContent(CreateNewConversatonRequestJason(newConvoGuid, author, creationTime),
                                    System.Text.Encoding.UTF8, "application/json"));
        var conversationPK = $"CONVO#{newConvoGuid}";

        // Act
        var content = new StringContent(CreateSendConversationInviteRequestJson(conversationPK, author, "", "invitee@example.com"),
                                         System.Text.Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("/conversations/invite", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorMessage = await response.Content.ReadAsStringAsync();
        errorMessage.Should().StartWith("Invitee Name cannot be null or empty.");
    }

    #endregion

    private Guid GetNewConversationGuid()
    {
        var guid = Guid.NewGuid();
        _CleanupConversationPosts.Enqueue($"CONVO#{guid}");

        return guid;
    }


    private static string CreateNewConversatonRequestJason(Guid guid, DateTimeOffset updatedAt) => CreateNewConversatonRequestJason(guid, "HttpTestUser", updatedAt);
    private static string CreateNewConversatonRequestJason(Guid guid, string Author, DateTimeOffset updatedAt) => $$"""
        {
            "NewGuid": "{{guid}}",
            "ConvoType": 2,
            "Title": "Test Conversation tilet",
            "MessageBody": "This is a test conversation message body",
            "Author": "{{Author}}",
            "UtcCreationTime": "{{updatedAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewDrillDownPostRequestJason(Guid newDrillDownPostguid, Guid convoGuid, DateTimeOffset updatedAt) => $$"""
        {
            "NewDrillDownGuid": "{{newDrillDownPostguid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "Title": "Drill-down",
            "MessageBody": "This is a drill-down post",
            "UtcCreationTime": "{{updatedAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewCommentPostRequestJson(Guid newCommentGuid, Guid convoGuid, DateTimeOffset updatedAt) => $$"""
        {
            "NewCommentGuid": "{{newCommentGuid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "MessageBody": "This is a comment post",
            "UtcCreationTime": "{{updatedAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateNewConclusionPostRequestJson(Guid newConclusionGuid, Guid convoGuid, DateTimeOffset updatedAt) => $$"""
        {
            "NewConclusionGuid": "{{newConclusionGuid}}",
            "ConversationPK": "CONVO#{{convoGuid}}",
            "ParentPostSK": "",
            "Author": "HttpTestUser",
            "Title": "Conclusion",
            "MessageBody": "This is a conclusion post",
            "UtcCreationTime": "{{updatedAt:yyyy-MM-ddTHH:mm:ssZ}}"
        }
        """;

    private static string CreateSendConversationInviteRequestJson(string conversationPK, string senderUsername, string inviteeName, string inviteeEmail) => $$"""
        {
            "ConversationPK": "{{conversationPK}}",
            "SenderUsername": "{{senderUsername}}",
            "InviteeName": "{{inviteeName}}",
            "InviteeEmail": "{{inviteeEmail}}"
        }
        """;

    public async Task InitializeAsync() => await Task.CompletedTask;

    public async Task DisposeAsync()
    {

        while (_CleanupConversationPosts.Count > 0)
        {
 
            var conversationPK = _CleanupConversationPosts.Dequeue();

            await _httpClient.DeleteAsync($"/conversations/{Uri.EscapeDataString(conversationPK)}");
        }

        _httpClient?.Dispose();

    await Task.CompletedTask;

    }
}