using Xunit;
using Amazon.DynamoDBv2.Model;
using Amazon.DynamoDBv2;
using Newtonsoft.Json;
using DynamoDbAccessCode;

namespace DynamoDbAccessCode.Tests
{

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

            string jsonConversation = null;

            try
            {
                var dbConversationsAndPosts = new ConversationsAndPosts();
                jsonConversation = await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);

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

        [Fact]
        public async Task CreateNewConversation_SaveItemIsIdempotent()
        {
            var guid = Guid.NewGuid();
            var convoType = ConversationsAndPosts.ConvoTypeEnum.DILEMMA;
            var title = "Idempotent title";
            var messageBody = "Itempotent message bodey";
            var authorId = "IdempotentTester";
            var utcNow = DateTimeOffset.Parse("1970-01-01T00:00:02Z");

            string jsonConversation = null;

            try
            {
                var dbConversationsAndPosts = new ConversationsAndPosts();
                await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);
                utcNow = DateTimeOffset.Parse("1970-01-01T00:00:12Z");
                jsonConversation = await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);


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

        [Fact]
        public async Task AppendDrillDownPost_SavesPostSuccessfully()
        {
            var conversationGuid = Guid.NewGuid();
            var convoType = ConversationsAndPosts.ConvoTypeEnum.QUESTION;
            var convrsationTitle = "Parent conversation for drill-down posts";
            var conversationMessageBody = "This is the main conversation that will have drill-down posts";
            var conversationAuthor = "TestyTester";
            var conversationTime = DateTimeOffset.Parse("1970-01-01T00:00:01Z");

            var drillDownPostGuid = Guid.NewGuid();
            var conversationPK = "CONVO#" + conversationGuid.ToString();
            var parentPostSK = "METADATA";
            var drillDownPostAuthor = "TestyTesterX";
            var drillDownpostMessageBody = "This is a drill-down post responding to the conversation";
            var drillDownPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");

            string jsonPost =null;

            try
            {
                var dbConversationsAndPosts = new ConversationsAndPosts();

                await dbConversationsAndPosts.CreateNewConversation(conversationGuid, convoType, convrsationTitle, conversationMessageBody, conversationAuthor, conversationTime);


                jsonPost = await dbConversationsAndPosts.AppendDrillDownPost(conversationPK, parentPostSK, drillDownPostGuid, drillDownPostAuthor, drillDownpostMessageBody, drillDownPostCreationTime);

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

            Dictionary<string, string> fields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonPost);

            Assert.True(string.IsNullOrEmpty(fields.GetValueOrDefault("UpdatedAtYear")));
            Assert.True(string.IsNullOrEmpty(fields.GetValueOrDefault("ConvoType")));
            Assert.True(string.IsNullOrEmpty(fields.GetValueOrDefault("Title")));

            Assert.Equal(conversationPK, fields["PK"]);
            Assert.Equal("#DD#" + drillDownPostGuid.ToString(), fields["SK"]);
            Assert.Equal(drillDownPostAuthor, fields["Author"]);
            Assert.Equal(drillDownpostMessageBody, fields["MessageBody"]);
            Assert.Equal(drillDownPostCreationTime.ToUnixTimeSeconds().ToString(), fields["UpdatedAt"]);

        }

        [Fact]
        public async Task AppendDrillDownPost_CreatesNestedPostHierarchySuccessfully()
        {
            var conversationGuid = Guid.NewGuid();
            var conversationAuthor = "TestyTester";
            var conversationTitle = "Conversation with nested drill-down posts";
            var conversationMessageBody = "This conversation will have nested drill-down posts";
            var conversationTime = DateTimeOffset.Parse("1970-01-01T00:00:01Z");

            var firstDrillDownPostGuid = Guid.NewGuid();
            var firstDrillDownPostTime = DateTimeOffset.Parse("1970-01-01T00:00:02Z");
            var firstDrillDownPostAuthor = "TestyTesterX";
            var firstDrillDownPostMessageBody = "First level drill-down post";

            var secondDrillDownPostGuid = Guid.NewGuid();
            var secondDrillDownPostTime = DateTimeOffset.Parse("1970-01-01T00:00:03Z");
            var secondDrillDownPostAuthor = "TestyTesterW";
            var secondDrillDownPostMessageBody = "Second level drill-down post (reply to first)";

            var thirdDrillDownPostGuid = Guid.NewGuid();
            var thirdDrillDownPostTime = DateTimeOffset.Parse("1970-01-01T00:00:04Z");
            var thirdDrillDownPostAuthor = "TestyTesterK";
            var thirDrillDownPostMessageBody = "Third level drill-down post (reply to second)";

            string jsonConversation;
            string jsonDrillDownFirstPost;
            string jsonDrillDownSecondPost;
            string jsonDrillDownThirdPost = null;

            Dictionary<string, string> conversationFields = null;
            Dictionary<string, string> firstDrillDownPostFields = null;
            Dictionary<string, string>  secondDrillDownPostFields = null;
            Dictionary<string, string>  thirdDrillDownPostFields;

            try
            {
                var dbConversationsAndPosts = new ConversationsAndPosts();

                jsonConversation = await dbConversationsAndPosts.CreateNewConversation(conversationGuid, ConversationsAndPosts.ConvoTypeEnum.PROBLEM, conversationTitle, conversationMessageBody, conversationAuthor, conversationTime);
                conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

                jsonDrillDownFirstPost = await dbConversationsAndPosts.AppendDrillDownPost(
                     conversationFields["PK"],
                     conversationFields["SK"],
                     firstDrillDownPostGuid,
                     firstDrillDownPostAuthor,
                     firstDrillDownPostMessageBody,
                     firstDrillDownPostTime);
                firstDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownFirstPost);                     

                jsonDrillDownSecondPost = await dbConversationsAndPosts.AppendDrillDownPost(
                    firstDrillDownPostFields["PK"],
                    firstDrillDownPostFields["SK"],
                    secondDrillDownPostGuid,
                    secondDrillDownPostAuthor,
                    secondDrillDownPostMessageBody,
                    secondDrillDownPostTime);
                secondDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownSecondPost);

                jsonDrillDownThirdPost = await dbConversationsAndPosts.AppendDrillDownPost(
                    secondDrillDownPostFields["PK"],
                    secondDrillDownPostFields["SK"],
                    thirdDrillDownPostGuid,
                    thirdDrillDownPostAuthor,
                    thirDrillDownPostMessageBody,
                    thirdDrillDownPostTime);

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
            

            Assert.Equal(conversationFields["PK"], firstDrillDownPostFields["PK"]);
            Assert.Equal("#DD#" + firstDrillDownPostGuid.ToString(), firstDrillDownPostFields["SK"]);
            Assert.Equal(firstDrillDownPostMessageBody, firstDrillDownPostFields["MessageBody"]);
            Assert.Equal(firstDrillDownPostTime.ToUnixTimeSeconds().ToString(), firstDrillDownPostFields["UpdatedAt"]);
            Assert.Equal(firstDrillDownPostAuthor, firstDrillDownPostFields["Author"]);
 
            Assert.Equal(conversationFields["PK"], secondDrillDownPostFields["PK"]);
            Assert.Equal("#DD#" + firstDrillDownPostGuid.ToString() + "#DD#" + secondDrillDownPostGuid.ToString(), secondDrillDownPostFields["SK"]);
            Assert.Equal(secondDrillDownPostMessageBody, secondDrillDownPostFields["MessageBody"]);
            Assert.Equal(secondDrillDownPostTime.ToUnixTimeSeconds().ToString(), secondDrillDownPostFields["UpdatedAt"]);
            Assert.Equal(secondDrillDownPostAuthor, secondDrillDownPostFields["Author"]);

            thirdDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownThirdPost);
            Assert.Equal(conversationFields["PK"], thirdDrillDownPostFields["PK"]);
            Assert.Equal("#DD#" + firstDrillDownPostGuid.ToString() + "#DD#" + secondDrillDownPostGuid.ToString() + "#DD#" + thirdDrillDownPostGuid.ToString(), thirdDrillDownPostFields["SK"]);
            Assert.Equal(thirDrillDownPostMessageBody, thirdDrillDownPostFields["MessageBody"]);
            Assert.Equal(thirdDrillDownPostTime.ToUnixTimeSeconds().ToString(), thirdDrillDownPostFields["UpdatedAt"]);
            Assert.Equal(thirdDrillDownPostAuthor, thirdDrillDownPostFields["Author"]);

        }
    }
}