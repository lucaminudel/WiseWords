using Xunit;
using Amazon.DynamoDBv2.Model;
using Amazon.DynamoDBv2;
using Newtonsoft.Json;

namespace DynamoDbAccessCode.Tests
{

    public class DynamoDbConversationsAndPostsTest : IAsyncLifetime
    {
        private readonly Queue<string> _dbCleanupConversationPostTest = new();

        public Task InitializeAsync() => Task.CompletedTask;

        [Fact]
        public async Task CreateNewConversation_SavesItemSuccessfully()
        {
            var guid = GetNewConversationGuid();
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
            var guid = GetNewConversationGuid();
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
            var c1 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var c6 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-10-01T00:00:06Z"));
            var c2 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var c5 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-07-01T00:00:05Z"));
            var c4 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-13T00:00:04Z"));
            var c3 = await dbConversationsAndPosts.CreateNewConversation(GetNewConversationGuid(), ConversationsAndPosts.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-12T00:00:03Z"));

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
            var conversationPostGuid = GetNewConversationGuid();

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
                GetNewConversationGuid(),
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
            Assert.Equal("#DD#" + firstDrillDownPostGuid.ToString() + "#DD#" + secondDrillDownPostGuid.ToString() + "#DD#" + thirdDrillDownPostGuid.ToString(), thirdDrillDownPostFields["SK"]);
            Assert.Equal(thirDrillDownPostMessageBody, thirdDrillDownPostFields["MessageBody"]);
            Assert.Equal(thirdDrillDownPostTime.ToUnixTimeSeconds().ToString(), thirdDrillDownPostFields["UpdatedAt"]);
            Assert.Equal(thirdDrillDownPostAuthor, thirdDrillDownPostFields["Author"]);

        }

        [Fact]
        public async Task AppendCommentPost_SavesCommentSuccessfully()
        {
            var conversationGuid = GetNewConversationGuid();

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
                GetNewConversationGuid(),
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
                GetNewConversationGuid(),
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
                Assert.Contains("Cannot append a Comment post to a Comment or Conclusion post", e.Message);
            }
        }

        [Fact]
        public async Task AppendDrillDownPost_CannotAppendDrillDownPostToComment()
        {
            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                GetNewConversationGuid(),
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
                Assert.Contains("Cannot append a DrillDown post to a Comment or Conclusion post", e.Message);
            }
        }

        [Fact]
        public async Task AppendConclusionPost_SavesConclusionToConversationSuccessfully()
        {
            var conversationGuid = GetNewConversationGuid();

            var conclusionPostGuid = Guid.NewGuid();
            var conclusionPostAuthor = "TestyTesterX";
            var conclusionPostMessageBody = "This is a conclusion post responding to the conversation";
            var conclusionPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");

            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                conversationGuid,
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Root conversation for conclusion posts",
                "This is the main conversation that will have conclusion posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonConclusionPost = await dbConversationsAndPosts.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                conclusionPostGuid,
                conclusionPostAuthor,
                conclusionPostMessageBody,
                conclusionPostCreationTime);

            var conclusionFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConclusionPost);

            Assert.True(string.IsNullOrEmpty(conclusionFields.GetValueOrDefault("UpdatedAtYear")));
            Assert.True(string.IsNullOrEmpty(conclusionFields.GetValueOrDefault("ConvoType")));
            Assert.True(string.IsNullOrEmpty(conclusionFields.GetValueOrDefault("Title")));

            Assert.Equal("CONVO#" + conversationGuid, conclusionFields["PK"]);
            Assert.Equal("#CC#" + conclusionPostGuid.ToString(), conclusionFields["SK"]);
            Assert.Equal(conclusionPostAuthor, conclusionFields["Author"]);
            Assert.Equal(conclusionPostMessageBody, conclusionFields["MessageBody"]);
            Assert.Equal(conclusionPostCreationTime.ToUnixTimeSeconds().ToString(), conclusionFields["UpdatedAt"]);
        }

        [Fact]
        public async Task AppendConclusionPost_SavesConclusionToDrillDownPostSuccessfully()
        {
            var drillDownPostGuid = Guid.NewGuid();

            var conclusionPostGuid = Guid.NewGuid();
            var conclusionPostTime = DateTimeOffset.Parse("1970-01-01T00:00:03Z");
            var conclusionPostAuthor = "TestyTesterW";
            var conclusionPostMessageBody = "This is a conclusion to the drill-down post";

            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                GetNewConversationGuid(),
                ConversationsAndPosts.ConvoTypeEnum.PROBLEM,
                "Conversation with drill-down posts and conclusions",
                "This conversation will have drill-down posts with conclusions",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonDrillDownPost = await dbConversationsAndPosts.AppendDrillDownPost(
                conversationFields["PK"],
                conversationFields["SK"],
                drillDownPostGuid,
                "TestyTesterX",
                "This is a drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var drillDownPostFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDownPost);

            var jsonConclusionPost = await dbConversationsAndPosts.AppendConclusionPost(
                drillDownPostFields["PK"],
                drillDownPostFields["SK"],
                conclusionPostGuid,
                conclusionPostAuthor,
                conclusionPostMessageBody,
                conclusionPostTime);
            var conclusionFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConclusionPost);

            Assert.Equal(conversationFields["PK"], conclusionFields["PK"]);
            Assert.Equal("#DD#" + drillDownPostGuid.ToString() + "#CC#" + conclusionPostGuid.ToString(), conclusionFields["SK"]);
            Assert.Equal(conclusionPostMessageBody, conclusionFields["MessageBody"]);
            Assert.Equal(conclusionPostTime.ToUnixTimeSeconds().ToString(), conclusionFields["UpdatedAt"]);
            Assert.Equal(conclusionPostAuthor, conclusionFields["Author"]);
        }

        [Fact]
        public async Task AppendConclusionPost_CannotAppendConclusionToComment()
        {
            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                GetNewConversationGuid(),
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Conversation for testing conclusion restrictions",
                "This conversation will test that conclusions cannot be added to comments",
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
                await dbConversationsAndPosts.AppendConclusionPost(
                    commentFields["PK"],
                    commentFields["SK"],
                    Guid.NewGuid(),
                    "TestyTesterW",
                    "This conclusion should fail to be added to the comment",
                    DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

                Assert.Fail("Expected ArgumentException when trying to append conclusion to a comment, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Cannot append a Conclusion post to a Comment or Conclusion post", e.Message);
            }
        }

        [Fact]
        public async Task AppendConclusionPost_CannotAppendConclusionToConclusion()
        {
            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                GetNewConversationGuid(),
                ConversationsAndPosts.ConvoTypeEnum.DILEMMA,
                "Conversation for testing conclusion-to-conclusion restrictions",
                "This conversation will test that conclusions cannot be added to other conclusions",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonFirstConclusion = await dbConversationsAndPosts.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is the first conclusion on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var firstConclusionFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonFirstConclusion);

            try
            {
                await dbConversationsAndPosts.AppendConclusionPost(
                    firstConclusionFields["PK"],
                    firstConclusionFields["SK"],
                    Guid.NewGuid(),
                    "TestyTesterW",
                    "This conclusion should fail to be added to the first conclusion",
                    DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

                Assert.Fail("Expected ArgumentException when trying to append conclusion to another conclusion, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Cannot append a Conclusion post to a Comment or Conclusion post", e.Message);
            }
        }

        [Fact]
        public async Task RetrieveConversationPosts_RetrievesAllPostsSuccessfullyAndInOrder()
        {
            var conversationGuid = GetNewConversationGuid();
            var drillDownGuid = Guid.NewGuid();
            var commentGuid = Guid.NewGuid();
            var conclusionGuid = Guid.NewGuid();
            var drillDownCommentGuid = Guid.NewGuid();

            var authorPrefix = "TestyWholeConvo";

            var dbConversationsAndPosts = new ConversationsAndPosts();

            var jsonConversation = await dbConversationsAndPosts.CreateNewConversation(
                conversationGuid,
                ConversationsAndPosts.ConvoTypeEnum.PROBLEM,
                "Test conversation with multiple posts",
                "This conversation will have various types of posts",
                authorPrefix,
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);

            var jsonDrillDown = await dbConversationsAndPosts.AppendDrillDownPost(
                conversationFields["PK"],
                conversationFields["SK"],
                drillDownGuid,
                authorPrefix + "-DD",
                "This is a drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var drillDownFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonDrillDown);

            await dbConversationsAndPosts.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                commentGuid,
                authorPrefix + "-CM",
                "This is a comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await dbConversationsAndPosts.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                conclusionGuid,
                authorPrefix + "-CC",
                "This is a conclusion to the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:04Z"));

            await dbConversationsAndPosts.AppendCommentPost(
                drillDownFields["PK"],
                drillDownFields["SK"],
                drillDownCommentGuid,
                authorPrefix + "-DDCM",
                "This is a comment on the drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:05Z"));

            var allPosts = await dbConversationsAndPosts.RetrieveConversationPosts(conversationFields["PK"]);

            var parsedPosts = allPosts.Select(JsonConvert.DeserializeObject<Dictionary<string, string>>).ToList();

            Assert.Equal(5, parsedPosts.Count);

            var conversation = parsedPosts[4];
            Assert.Equal("METADATA", conversation["SK"]);
            Assert.Equal("CONVO#" + conversationGuid.ToString(), conversation["PK"]);
            Assert.Equal("Test conversation with multiple posts", conversation["Title"]);

            var conclusionPost = parsedPosts[0];
            Assert.Equal("#CC#" + conclusionGuid.ToString(), conclusionPost["SK"]);
            Assert.Equal(conclusionPost["PK"], conversation["PK"]);
            Assert.Equal("This is a conclusion to the conversation", conclusionPost["MessageBody"]);

            var commentPost = parsedPosts[1];
            Assert.Equal("#CM#" + commentGuid.ToString(), commentPost["SK"]);
            Assert.Equal(commentPost["PK"], conversation["PK"]);
            Assert.Equal("This is a comment on the conversation", commentPost["MessageBody"]);

            var drillDownPost = parsedPosts[2];
            Assert.Equal("#DD#" + drillDownGuid.ToString(), drillDownPost["SK"]);
            Assert.Equal(drillDownPost["PK"], conversation["PK"]);
            Assert.Equal("This is a drill-down post", drillDownPost["MessageBody"]);

            var drillDownCommentPost = parsedPosts[3];
            Assert.Equal("#DD#" + drillDownGuid.ToString() + "#CM#" + drillDownCommentGuid.ToString(), drillDownCommentPost["SK"]);
            Assert.Equal(drillDownCommentPost["PK"], conversation["PK"]);
            Assert.Equal("This is a comment on the drill-down post", drillDownCommentPost["MessageBody"]);
        }

        [Fact]
        public async Task RetrieveConversationPosts_ReturnsEmptyListForNonExistentConversation()
        {
            var nonExistentConversationPK = "CONVO#" + Guid.NewGuid().ToString();
            var dbConversationsAndPosts = new ConversationsAndPosts();

            var posts = await dbConversationsAndPosts.RetrieveConversationPosts(nonExistentConversationPK);

            Assert.Empty(posts);
        }

        [Fact]
        public async Task RetrieveConversationPosts_InvalidConversationPkParameterFails()
        {
            var dbConversationsAndPosts = new ConversationsAndPosts();

            try
            {
                await dbConversationsAndPosts.RetrieveConversationPosts("INVALID_PK");
                Assert.Fail("Expected ArgumentException for invalid conversation PK format, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Conversation PK must start with 'CONVO#'", e.Message);
            }

            try
            {
                await dbConversationsAndPosts.RetrieveConversationPosts(null);
                Assert.Fail("Expected ArgumentException for null conversation PK, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Conversation PK cannot be null or empty", e.Message);
            }

            try
            {
                await dbConversationsAndPosts.RetrieveConversationPosts("");
                Assert.Fail("Expected ArgumentException for empty conversation PK, but no exception was thrown.");
            }
            catch (ArgumentException e)
            {
                Assert.Contains("Conversation PK cannot be null or empty", e.Message);
            }
        }

        [Fact]
        public async Task DeleteConversationAndPosts_DeletesAllItemsSuccessfully()
        {
            var conversationGuid = GetNewConversationGuid();
            var db = new ConversationsAndPosts();

            var jsonConversation = await db.CreateNewConversation(
                conversationGuid,
                ConversationsAndPosts.ConvoTypeEnum.QUESTION,
                "Test Deletion",
                "This conversation should be deleted.",
                "DeletionTester",
                DateTimeOffset.UtcNow);
            var conversationFields = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonConversation);
            var conversationPK = conversationFields["PK"];

            await db.AppendCommentPost(
                conversationPK,
                "METADATA",
                Guid.NewGuid(),
                "Commenter",
                "This comment should also be deleted.",
                DateTimeOffset.UtcNow);

            await db.DeleteConversationAndPosts(conversationPK);

            var posts = await db.RetrieveConversationPosts(conversationPK);
            Assert.Empty(posts);
        }

        private Guid GetNewConversationGuid()
        {
            var guid = Guid.NewGuid();
            _dbCleanupConversationPostTest.Enqueue($"CONVO#{guid}");

            return guid;
        }
        public async Task DisposeAsync()
        {
            var db = new ConversationsAndPosts();
            while (_dbCleanupConversationPostTest.Count > 0)
            {
                await db.DeleteConversationAndPosts(_dbCleanupConversationPostTest.Dequeue());
            }
        }

    }
}