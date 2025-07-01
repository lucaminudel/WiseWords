using DynamoDbAccessCodeToAWSLambda;

namespace SpikeB.WiseWordsAWSLambdaFacade.Tests
{

public class ConversationsAndPostsLambdaHandlersTests
{
        [Fact]
        public async Task CreateNewConversationHandler_ReturnsEmptyString_WhenServiceReturnsEmpty()
        {
            var function = new ConversationsAndPostsLambdaHandlers();
            var request = new CreateNewConversationRequest
            {
                NewGuid = Guid.NewGuid(),
                ConvoType = ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                Title = "Test Title",
                MessageBody = "Test Body",
                Author = "Test Author",
                UtcCreationTime = DateTimeOffset.FromUnixTimeSeconds(1751321768)
            };
            var context = new lambdaCallContext();

            var jsonResult = await function.CreateNewConversationHandler(request, context);

            var result = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(jsonResult);

            Assert.NotNull(result);
            Assert.Equal("CONVO#" + request.NewGuid.ToString(), result["PK"]["S"]);
            Assert.Equal("METADATA", result["SK"]["S"]);
            Assert.Equal("Test Author", result["Author"]["S"]);
            Assert.Equal("2025", result["UpdatedAtYear"]["N"]);
            Assert.Equal("QUESTION", result["ConvoType"]["S"]);
            Assert.Equal("Test Title", result["Title"]["S"]);
            Assert.Equal("Test Body", result["MessageBody"]["S"]);
            Assert.Equal("1751321768", result["UpdatedAt"]["N"]);
        
    }
}
}