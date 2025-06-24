using Xunit;
using Amazon.DynamoDBv2.Model;
using Amazon.DynamoDBv2;
using Newtonsoft.Json;

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

            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);
            Assert.Equal("CONVO#" + guid.ToString(), conversationFields["PK"]);
            Assert.Equal("METADATA", conversationFields["SK"]);
            Assert.Equal(authorId, conversationFields["Author"]);
            Assert.Equal(title, conversationFields["Title"]);
            Assert.Equal(convoType.ToString(), conversationFields["ConvoType"]);
            Assert.Equal(messageBody, conversationFields["MessageBody"]);
            Assert.Equal(utcNow.ToUnixTimeSeconds().ToString(), conversationFields["UpdatedAt"]);
            Assert.Equal(utcNow.Year.ToString(), conversationFields["UpdatedAtYear"]);
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
            await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);

            utcNow = DateTimeOffset.Parse("1970-01-01T00:00:12Z");
            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(guid, convoType, title, messageBody, authorId, utcNow);

            var fields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);
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
            var conversationPostGuid = Guid.NewGuid();

            var drillDownPostGuid = Guid.NewGuid();
            var drillDownPostAuthor = "TestyTesterX";
            var drillDownpostMessageBody = "This is a drill-down post responding to the conversation";
            var drillDownPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");


            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                conversationPostGuid,
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Parent conversation for drill-down posts",
                "This is the main conversation that will have drill-down posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);


            var jsonDrillDownPost = await dbConversationsAndPosts.AppendDrillDownPost(
                conversationFields["PK"],
                conversationFields["SK"],
                drillDownPostGuid,
                drillDownPostAuthor,
                drillDownpostMessageBody,
                drillDownPostCreationTime);
            var drillDownfields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownPost);

            Assert.True(string.IsNullOrEmpty(drillDownfields.GetValueOrDefault("UpdatedAtYear")));
            Assert.True(string.IsNullOrEmpty(drillDownfields.GetValueOrDefault("ConvoType")));
            Assert.True(string.IsNullOrEmpty(drillDownfields.GetValueOrDefault("Title")));

            Assert.Equal("CONVO#" + conversationPostGuid, drillDownfields["PK"]);
            Assert.Equal("#DD#" + drillDownPostGuid.ToString(), drillDownfields["SK"]);
            Assert.Equal(drillDownPostAuthor, drillDownfields["Author"]);
            Assert.Equal(drillDownpostMessageBody, drillDownfields["MessageBody"]);
            Assert.Equal(drillDownPostCreationTime.ToUnixTimeSeconds().ToString(), drillDownfields["UpdatedAt"]);
        }

        [Fact]
        public async Task AppendDrillDownPost_CreatesNestedPostHierarchySuccessfully()
        {
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


            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                Guid.NewGuid(),
                ConversationsAndPosts.ConvoTypeEnum.PROBLEM,
                "Conversation with nested drill-down posts",
                "This conversation will have nested drill-down posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonDrillDownFirstPost = await dbConversationsAndPosts.AppendDrillDownPost(
                    conversationFields["PK"],
                    conversationFields["SK"],
                    firstDrillDownPostGuid,
                    firstDrillDownPostAuthor,
                    firstDrillDownPostMessageBody,
                    firstDrillDownPostTime);
            var firstDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownFirstPost);

            var jsonDrillDownSecondPost = await dbConversationsAndPosts.AppendDrillDownPost(
                firstDrillDownPostFields["PK"],
                firstDrillDownPostFields["SK"],
                secondDrillDownPostGuid,
                secondDrillDownPostAuthor,
                secondDrillDownPostMessageBody,
                secondDrillDownPostTime);
            var secondDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownSecondPost);

            var jsonDrillDownThirdPost = await dbConversationsAndPosts.AppendDrillDownPost(
                secondDrillDownPostFields["PK"],
                secondDrillDownPostFields["SK"],
                thirdDrillDownPostGuid,
                thirdDrillDownPostAuthor,
                thirDrillDownPostMessageBody,
                thirdDrillDownPostTime);
            var thirdDrillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownThirdPost);

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

            Assert.Equal(conversationFields["PK"], thirdDrillDownPostFields["PK"]);
            Assert.Equal("#DD#" + firstDrillDownPostGuid.ToString() + "#DD#" + secondDrillDownPostGuid.ToString() + "#DD#" + thirdDrillDownPostGuid.ToString(),             thirdDrillDownPostFields["SK"]);
            Assert.Equal(thirDrillDownPostMessageBody, thirdDrillDownPostFields["MessageBody"]);
            Assert.Equal(thirdDrillDownPostTime.ToUnixTimeSeconds().ToString(), thirdDrillDownPostFields["UpdatedAt"]);
            Assert.Equal(thirdDrillDownPostAuthor, thirdDrillDownPostFields["Author"]);

        }

        [Fact]
        public async Task AppendCommentPost_SavesCommentSuccessfully()
        {
            var conversationGuid = Guid.NewGuid();

            var commentPostGuid = Guid.NewGuid();
            var conversationPK = "CONVO#" + conversationGuid.ToString();
            var parentPostSK = "METADATA";
            var commentPostAuthor = "TestyTesterX";
            var commentPostMessageBody = "This is a comment responding to the conversation";
            var commentPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");

            var dbConversationsAndPosts = new ConversationsAndPosts();

            await dbConversationsAndPosts.CreateNewConversation(
                conversationGuid,
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Root conversation for comment posts",
                "This is the main conversation that will have comment posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));

            var jsonCommentPost = await dbConversationsAndPosts.AppendCommentPost(
                conversationPK,
                parentPostSK,
                commentPostGuid,
                commentPostAuthor,
                commentPostMessageBody,
                commentPostCreationTime);

            var commentFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonCommentPost);

            Assert.True(string.IsNullOrEmpty(commentFields.GetValueOrDefault("UpdatedAtYear")));
            Assert.True(string.IsNullOrEmpty(commentFields.GetValueOrDefault("ConvoType")));
            Assert.True(string.IsNullOrEmpty(commentFields.GetValueOrDefault("Title")));

            Assert.Equal(conversationPK, commentFields["PK"]);
            Assert.Equal("#CM#" + commentPostGuid.ToString(), commentFields["SK"]);
            Assert.Equal(commentPostAuthor, commentFields["Author"]);
            Assert.Equal(commentPostMessageBody, commentFields["MessageBody"]);
            Assert.Equal(commentPostCreationTime.ToUnixTimeSeconds().ToString(), commentFields["UpdatedAt"]);

        }

        [Fact]
        public async Task AppendCommentPost_CreatesCommentsOnDrillDownPostsSuccessfully()
        {
            var drillDownPostGuid = Guid.NewGuid();
            var drillDownPostTime = DateTimeOffset.Parse("1970-01-01T00:00:02Z");
            var drillDownPostAuthor = "TestyTesterX";
            var drillDownPostMessageBody = "This is a drill-down post";

            var conversationCommentGuid = Guid.NewGuid();
            var conversationCommentTime = DateTimeOffset.Parse("1970-01-01T00:00:03Z");
            var conversationCommentAuthor = "TestyTesterW";
            var conversationCommentMessageBody = "Comment directly on conversation";

            var drillDownCommentGuid = Guid.NewGuid();
            var drillDownCommentTime = DateTimeOffset.Parse("1970-01-01T00:00:04Z");
            var drillDownCommentAuthor = "TestyTesterK";
            var drillDownCommentMessageBody = "Comment on drill-down post";


            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                Guid.NewGuid(),
                ConversationsAndPosts.ConvoTypeEnum.PROBLEM,
                "Conversation with drill-down posts and comments",
                "This conversation will have drill-down posts with comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonConversationComment = await dbConversationsAndPosts.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                conversationCommentGuid,
                conversationCommentAuthor,
                conversationCommentMessageBody,
                conversationCommentTime);
            var conversationCommentFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversationComment);

            var jsonDrillDownPost = await dbConversationsAndPosts.AppendDrillDownPost(
                    conversationFields["PK"],
                    conversationFields["SK"],
                    drillDownPostGuid,
                    drillDownPostAuthor,
                    drillDownPostMessageBody,
                    drillDownPostTime);
            var drillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownPost);

            var jsonDrillDownComment = await dbConversationsAndPosts.AppendCommentPost(
                drillDownPostFields["PK"],
                drillDownPostFields["SK"],
                drillDownCommentGuid,
                drillDownCommentAuthor,
                drillDownCommentMessageBody,
                drillDownCommentTime);


            Assert.Equal(conversationFields["PK"], drillDownPostFields["PK"]);
            Assert.Equal("#DD#" + drillDownPostGuid.ToString(), drillDownPostFields["SK"]);
            Assert.Equal(drillDownPostMessageBody, drillDownPostFields["MessageBody"]);
            Assert.Equal(drillDownPostTime.ToUnixTimeSeconds().ToString(), drillDownPostFields["UpdatedAt"]);
            Assert.Equal(drillDownPostAuthor, drillDownPostFields["Author"]);

            Assert.Equal(conversationFields["PK"], conversationCommentFields["PK"]);
            Assert.Equal("#CM#" + conversationCommentGuid.ToString(), conversationCommentFields["SK"]);
            Assert.Equal(conversationCommentMessageBody, conversationCommentFields["MessageBody"]);
            Assert.Equal(conversationCommentTime.ToUnixTimeSeconds().ToString(), conversationCommentFields["UpdatedAt"]);
            Assert.Equal(conversationCommentAuthor, conversationCommentFields["Author"]);

            var drillDownCommentFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownComment);
            Assert.Equal(conversationFields["PK"], drillDownCommentFields["PK"]);
            Assert.Equal("#DD#" + drillDownPostGuid.ToString() + "#CM#" + drillDownCommentGuid.ToString(), drillDownCommentFields["SK"]);
            Assert.Equal(drillDownCommentMessageBody, drillDownCommentFields["MessageBody"]);
            Assert.Equal(drillDownCommentTime.ToUnixTimeSeconds().ToString(), drillDownCommentFields["UpdatedAt"]);
            Assert.Equal(drillDownCommentAuthor, drillDownCommentFields["Author"]);

        }

        [Fact]
        public async Task AppendCommentPost_CannotAppendCommentToComment()
        {

            var jsonConversation = await new ConversationsAndPosts().CreateNewConversation(
                Guid.NewGuid(),
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Conversation for testing comment restrictions",
                "This conversation will test that comments cannot be added to other comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonFirstComment = await new ConversationsAndPosts().AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is the first comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var firstCommentFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonFirstComment);

            try
            {
                await new ConversationsAndPosts().AppendCommentPost(
                    firstCommentFields["PK"],
                    firstCommentFields["SK"],
                    Guid.NewGuid(),
                    "TestyTesterW",
                    "This comment should fail to be added to the first comment",
                    DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

                Assert.Fail("Expected ArgumentException when trying to append comment to another comment, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Parent Post SK tree's path must not contain '#CM#' or '#CONVO#'", e.Message);
            }
        }

        [Fact]
        public async Task AppendDrillDownPost_CannotAppendDrillDownPostToComment()
        {
            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                Guid.NewGuid(),
                ConversationsAndPosts.ConvoTypeEnum.PROBLEM,
                "Conversation for testing drill-down post restrictions",
                "This conversation will test that drill-down posts cannot be added to comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonComment = await dbConversationsAndPosts.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is a comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var commentFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonComment);

            try
            {
                await dbConversationsAndPosts.AppendDrillDownPost(
                    commentFields["PK"],
                    commentFields["SK"],
                    Guid.NewGuid(),
                    "TestyTesterW",
                    "This drill-down post should fail to be added to the comment",
                    DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

                Assert.Fail("Expected ArgumentException when trying to append drill-down post to a comment, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Parent Post SK tree's path must not contain '#CM#' or '#CONVO#'", e.Message);
            }
        }
    }
}