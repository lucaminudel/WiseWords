using Xunit;
using Amazon.DynamoDBv2.Model;
using Amazon.DynamoDBv2;
using Newtonsoft.Json;
using DynamoDbAccessCode;

public class DynamoDbConversationsAndPostsTest
{
    [Fact]
    public async Task CreateNewConversation_SavesItemSuccessfully()
    {
        var guid = Guid.NewGuid();
        var convoType = ConversationsAndPosts.ConvoTypeEnum.DILEMMA;
        var title = "Develop and test AWS lambda locally without cloud access";
        var messageBody = "looking for a practical way to create cloud code on a local dev environment in a reliable efficient way";
        var authorId = "TestyTester";
        var utcNow = DateTimeOffset.Parse("1970-01-01T00:00:02Z"); 


        var dbConversationsAndPosts = new ConversationsAndPosts();
        try
        {
            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);

            Dictionary<string, string> fields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);
            Assert.Equal("CONVO#" + guid.ToString(), fields["PK"]);
            Assert.Equal("METADATA", fields["SK"]);
            Assert.Equal(authorId, fields["Author"]);
            Assert.Equal(title, fields["Title"]);
            Assert.Equal(convoType.ToString(), fields["ConvoType"]);
            Assert.Equal(messageBody, fields["MessageBody"]);
            Assert.Equal(utcNow.ToUnixTimeSeconds().ToString(), fields["UpdatedAt"]);
            Assert.Equal(utcNow.Year.ToString(), fields["UpdatedAtYear"]);
        }
        catch (ConditionalCheckFailedException e)
        {
            Assert.Fail($"CONDITIONAL CHECK FAILED: The write operation for the item failed because a condition was not met. This often indicates a concurrency issue or a business rule violation. Error: {e.Message}");
        }
        catch (ItemCollectionSizeLimitExceededException e)
        {
            Assert.Fail($"ITEM COLLECTION SIZE LIMIT EXCEEDED: The item collection size limit was exceeded. Error: {e.Message}");
        }
        catch (ResourceNotFoundException e)
        {
            Assert.Fail($"RESOURCE NOT FOUND: The specified resource does not exist. Error: {e.Message}");
        }
        catch (RequestLimitExceededException e)
        {
            Assert.Fail($"REQUEST LIMIT EXCEEDED: The write operation for the item was throttled due to request limits. Error: {e.Message}");
        }
        catch (ProvisionedThroughputExceededException e)
        {
            Assert.Fail($"PROVISIONED THROUGHPUT EXCEEDED: The write operation for the item was throttled. Error: {e.Message}");
        }
        catch (InternalServerErrorException e)
        {
            Assert.Fail($"INTERNAL SERVER ERROR: An unexpected error occurred on the server. Error: {e.Message}");
        }
        catch (AmazonDynamoDBException e)
        {
            Assert.Fail($"DynamoDB Error: {e.Message}\nError Code: {e.ErrorCode}\nError Type: {e.ErrorType}\nRequest ID: {e.RequestId}");
        }
        catch (Exception e)
        {
            Assert.Fail($"General Error: {e.Message}");
        }

        Assert.True(true, "Item saved successfully without exceptions.");
    }

    [Fact]
    public async Task CreateNewConversation_SaveItemIsIdempotent()
    {
        var guid = Guid.NewGuid();
        var convoType = ConversationsAndPosts.ConvoTypeEnum.DILEMMA;
        var title = "Idempotent title";
        var messageBody = "Itempotent message bodey";
        var authorId = "IdempotentTester";
        var utcNow = DateTimeOffset.Parse("1970-01-01T00:00:02Z"); 

        var dbConversationsAndPosts = new ConversationsAndPosts();
        try
        {
            await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);
            utcNow = DateTimeOffset.Parse("1970-01-01T00:00:12Z"); 
            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);


            Dictionary<string, string> fields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);
            Assert.Equal("CONVO#" + guid.ToString(), fields["PK"]);
            Assert.Equal("METADATA", fields["SK"]);
            Assert.Equal(authorId, fields["Author"]);
            Assert.Equal(title, fields["Title"]);
            Assert.Equal(convoType.ToString(), fields["ConvoType"]);
            Assert.Equal(messageBody, fields["MessageBody"]);
            Assert.Equal(utcNow.ToUnixTimeSeconds().ToString(), fields["UpdatedAt"]);
            Assert.Equal(utcNow.Year.ToString(), fields["UpdatedAtYear"]);
        }
        catch (ConditionalCheckFailedException e)
        {
            Assert.Fail($"CONDITIONAL CHECK FAILED: The write operation for the item failed because a condition was not met. This often indicates a concurrency issue or a business rule violation. Error: {e.Message}");
        }
        catch (ItemCollectionSizeLimitExceededException e)
        {
            Assert.Fail($"ITEM COLLECTION SIZE LIMIT EXCEEDED: The item collection size limit was exceeded. Error: {e.Message}");
        }
        catch (ResourceNotFoundException e)
        {
            Assert.Fail($"RESOURCE NOT FOUND: The specified resource does not exist. Error: {e.Message}");
        }
        catch (RequestLimitExceededException e)
        {
            Assert.Fail($"REQUEST LIMIT EXCEEDED: The write operation for the item was throttled due to request limits. Error: {e.Message}");
        }
        catch (ProvisionedThroughputExceededException e)
        {
            Assert.Fail($"PROVISIONED THROUGHPUT EXCEEDED: The write operation for the item was throttled. Error: {e.Message}");
        }
        catch (InternalServerErrorException e)
        {
            Assert.Fail($"INTERNAL SERVER ERROR: An unexpected error occurred on the server. Error: {e.Message}");
        }
        catch (AmazonDynamoDBException e)
        {
            Assert.Fail($"DynamoDB Error: {e.Message}\nError Code: {e.ErrorCode}\nError Type: {e.ErrorType}\nRequest ID: {e.RequestId}");
        }
        catch (Exception e)
        {
            Assert.Fail($"General Error: {e.Message}");
        }

        Assert.True(true, "Item saved successfully without exceptions.");
    }

    [Fact]
    public async Task RetrieveConversations_RetrieveAllItemsSuccessfully()
    {

        var uniqueAuthor = "AutomaticTestAuthor" + Guid.NewGuid();
        var title = "A short title for a conversation";
        var messageBody = "a message body for a conversation";

        // Create conversations with non consecutive UpdateAt timestamps to ensure they are sorted by UpdateAt in the retrieval method.
        var dbConversationsAndPosts = new ConversationsAndPosts();
        var c1 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
        var c6 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-10-01T00:00:06Z"));
        var c2 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
        var c5 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-07-01T00:00:05Z"));
        var c4 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-13T00:00:04Z"));
        var c3 = await dbConversationsAndPosts.CreateNewConversation(Guid.NewGuid(), ConversationsAndPosts.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-12T00:00:03Z"));

        var newConversationsSortedByUpdatedAt = new List<Dictionary<string, string>>
        {
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c1),
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c2),
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c3),
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c4),
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c5),
            JsonConvert.DeserializeObject<Dictionary<string, string>>(c6)
        };

        var retrievedConversations = await dbConversationsAndPosts.RetrieveConversations(1970, uniqueAuthor);

        Assert.Equal(newConversationsSortedByUpdatedAt.Count, retrievedConversations.Count);
        for (int i = 0; i < retrievedConversations.Count; i++)
        {
            var retrievedConversationJson = JsonConvert.DeserializeObject<Dictionary<string, string>>(retrievedConversations[i]);

            Assert.Equal(newConversationsSortedByUpdatedAt[i]["PK"], retrievedConversationJson["PK"]);
            Assert.Equal(newConversationsSortedByUpdatedAt[i]["Author"], retrievedConversationJson["Author"]);
            Assert.Equal(newConversationsSortedByUpdatedAt[i]["Title"], retrievedConversationJson["Title"]);
            Assert.Equal(newConversationsSortedByUpdatedAt[i]["ConvoType"], retrievedConversationJson["ConvoType"]);
            Assert.Equal(newConversationsSortedByUpdatedAt[i]["UpdatedAt"], retrievedConversationJson["UpdatedAt"]);
            Assert.Equal(newConversationsSortedByUpdatedAt[i]["UpdatedAtYear"], retrievedConversationJson["UpdatedAtYear"]);
        }
    }
}
