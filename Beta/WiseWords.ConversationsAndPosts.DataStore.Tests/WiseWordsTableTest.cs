using System.Text.Json;
using FluentAssertions;

namespace WiseWords.ConversationsAndPosts.DataStore.Tests
{

    public class WiseWordsTableTest : IAsyncLifetime
    {
        private readonly WiseWordsTable _db = new(new Uri("http://localhost:8000"));
        private readonly Queue<string> _dbCleanupConversationPostTest = new();


         private enum PostType { Conversation, Post }

        private static TestDataBuilders.ConversationBuilder AConversation() => TestDataBuilders.AConversation();
        private static TestDataBuilders.PostBuilder APost() => TestDataBuilders.APost();
        private static TestDataBuilders.DrillDownHierarchyBuilder ADrillDownHierarchy() => TestDataBuilders.ADrillDownHierarchy();


        public Task InitializeAsync() => Task.CompletedTask;

        [Fact]
        public async Task CreateNewConversation_SavesItemSuccessfully()
        {
            // Arrange
            var guid = GetNewConversationGuid();
            var timestamp = DateTimeOffset.Parse("1970-01-01T00:00:02Z");

            // Act
            var conversationFields = await AConversation()
                .WithGuid(guid)
                .WithType(WiseWordsTable.ConvoTypeEnum.DILEMMA)
                .WithTitle("Develop and test AWS lambda locally without cloud access")
                .WithMessageBody("looking for a practical way to create cloud code on a local dev environment in a reliable efficient way")
                .WithAuthor("TestyTester")
                .WithTimestamp(timestamp)
                .CreateAsync(_db);

            // Assert
            var expectedFields = new Dictionary<string, string>
            {
                ["PK"] = $"CONVO#{guid}",
                ["SK"] = "METADATA",
                ["Author"] = "TestyTester",
                ["Title"] = "Develop and test AWS lambda locally without cloud access",
                ["ConvoType"] = "DILEMMA",
                ["MessageBody"] = "looking for a practical way to create cloud code on a local dev environment in a reliable efficient way",
                ["UpdatedAt"] = timestamp.ToUnixTimeSeconds().ToString(),
                ["UpdatedAtYear"] = timestamp.Year.ToString()
            };

            AssertConversationMatches(conversationFields, expectedFields);
        }

        [Fact]
        public async Task CreateNewConversation_SaveItemIsIdempotent()
        {
            // Arrange
            var guid = GetNewConversationGuid();
            var convoType = WiseWordsTable.ConvoTypeEnum.DILEMMA;
            var title = "Idempotent title";
            var messageBody = "Itempotent message bodey";
            var authorId = "IdempotentTester";
            var firstTime = DateTimeOffset.Parse("1970-01-01T00:00:02Z");
            var secondTime = DateTimeOffset.Parse("1970-01-01T00:00:12Z");

            // Act - Create conversation twice with same GUID
            await _db.CreateNewConversation(guid, convoType, title, messageBody, authorId, firstTime);
            var jsonConversation = await _db.CreateNewConversation(guid, convoType, title, messageBody, authorId, secondTime);

            // Assert - Second call should update the existing conversation
            var fields = DeserialiseToStringDictionary.This(jsonConversation);
            var expectedFields = new Dictionary<string, string>
            {
                ["PK"] = $"CONVO#{guid}",
                ["SK"] = "METADATA",
                ["Author"] = authorId,
                ["Title"] = title,
                ["ConvoType"] = convoType.ToString(),
                ["MessageBody"] = messageBody,
                ["UpdatedAt"] = secondTime.ToUnixTimeSeconds().ToString(),
                ["UpdatedAtYear"] = secondTime.Year.ToString()
            };
            
            AssertConversationMatches(fields, expectedFields);
        }

        [Fact]
        public async Task RetrieveConversations_RetrieveAllItemsSuccessfully()
        {
            // Arrange
            var uniqueAuthor = "AutomaticTestAuthor" + Guid.NewGuid();
            var title = "A short title for a conversation";
            var messageBody = "a message body for a conversation";

            // Create conversations OUT OF ORDER by UpdatedAt to test that retrieval sorts them correctly
            var c1 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var c6 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-10-01T00:00:06Z"));
            var c2 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var c5 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.PROBLEM, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-07-01T00:00:05Z"));
            var c4 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.DILEMMA, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-13T00:00:04Z"));
            var c3 = await _db.CreateNewConversation(GetNewConversationGuid(), WiseWordsTable.ConvoTypeEnum.QUESTION, title, messageBody, uniqueAuthor, DateTimeOffset.Parse("1970-02-12T00:00:03Z"));

            // Expected order: sorted by UpdatedAt (c1, c2, c3, c4, c5, c6)
            var expectedConversationsInOrder = new[]
            {
                DeserialiseToStringDictionary.This(c1),
                DeserialiseToStringDictionary.This(c2),
                DeserialiseToStringDictionary.This(c3),
                DeserialiseToStringDictionary.This(c4),
                DeserialiseToStringDictionary.This(c5),
                DeserialiseToStringDictionary.This(c6)
            };

            // Act
            var retrievedConversations = await _db.RetrieveConversations(1970, uniqueAuthor);

            // Assert - Verify conversations are returned sorted by UpdatedAt
            retrievedConversations.Should().HaveCount(expectedConversationsInOrder.Length);
            
            for (int i = 0; i < retrievedConversations.Count; i++)
            {
                var retrieved = retrievedConversations[i];
                var expected = expectedConversationsInOrder[i];

                retrieved["PK"].Should().Be(expected["PK"]);
                retrieved["Author"].Should().Be(expected["Author"]);
                retrieved["Title"].Should().Be(expected["Title"]);
                retrieved["ConvoType"].Should().Be(expected["ConvoType"]);
                retrieved["UpdatedAt"].Should().Be(expected["UpdatedAt"]);
                retrieved["UpdatedAtYear"].Should().Be(expected["UpdatedAtYear"]);
            }
        }

        [Fact]
        public async Task AppendDrillDownPost_SavesPostSuccessfully()
        {
            // Arrange
            var conversationGuid = GetNewConversationGuid();
            var drillDownGuid = Guid.NewGuid();
            var drillDownTimestamp = DateTimeOffset.Parse("1970-01-01T00:00:10Z");
            

            var conversation = await AConversation()
                .WithGuid(conversationGuid)
                .WithType(WiseWordsTable.ConvoTypeEnum.QUESTION)
                .WithTitle("Parent conversation for drill-down posts")
                .WithMessageBody("This is the main conversation that will have drill-down posts")
                .WithAuthor("TestyTester")
                .CreateAsync(_db);

            // Act
            var drillDownPost = await APost()
                .WithGuid(drillDownGuid)
                .WithAuthor("TestyTesterX")
                .WithMessageBody("This is a drill-down post responding to the conversation")
                .WithTimestamp(drillDownTimestamp)
                .CreateDrillDownAsync(_db, conversation["PK"], conversation["SK"]);

            // Assert
            var expectedDrillDownPost = new Dictionary<string, string>
            {
                ["PK"] = $"CONVO#{conversationGuid}",
                ["SK"] = $"#DD#{drillDownGuid}",
                ["Author"] = "TestyTesterX",
                ["MessageBody"] = "This is a drill-down post responding to the conversation",
                ["UpdatedAt"] = drillDownTimestamp.ToUnixTimeSeconds().ToString()
            };

            AssertPostMatches(drillDownPost, expectedDrillDownPost);
        }

        [Fact]
        public async Task AppendDrillDownPost_CreatesNestedPostHierarchySuccessfully()
        {
            // Arrange
            var firstGuid = Guid.NewGuid();
            var secondGuid = Guid.NewGuid();
            var thirdGuid = Guid.NewGuid();
            

            var conversation = await AConversation()
                .WithGuid(GetNewConversationGuid())
                .WithType(WiseWordsTable.ConvoTypeEnum.PROBLEM)
                .WithTitle("Conversation with nested drill-down posts")
                .WithMessageBody("This conversation will have nested drill-down posts")
                .WithAuthor("TestyTester")
                .CreateAsync(_db);

            // Act - Create nested hierarchy using fluent builder
            var drillDownPosts = await ADrillDownHierarchy()
                .WithConversation(conversation)
                .AddLevel(firstGuid, "TestyTesterX", "First level drill-down post", DateTimeOffset.Parse("1970-01-01T00:00:02Z"))
                .AddLevel(secondGuid, "TestyTesterW", "Second level drill-down post (reply to first)", DateTimeOffset.Parse("1970-01-01T00:00:03Z"))
                .AddLevel(thirdGuid, "TestyTesterK", "Third level drill-down post (reply to second)", DateTimeOffset.Parse("1970-01-01T00:00:04Z"))
                .BuildAsync(_db);

            // Assert - Verify nested hierarchy structure using simplified assertions
            var expectedHierarchy = new[]
            {
                new Dictionary<string, string>
                {
                    ["PK"] = conversation["PK"],
                    ["SK"] = $"#DD#{firstGuid}",
                    ["Author"] = "TestyTesterX",
                    ["MessageBody"] = "First level drill-down post",
                    ["UpdatedAt"] = DateTimeOffset.Parse("1970-01-01T00:00:02Z").ToUnixTimeSeconds().ToString()
                },
                new Dictionary<string, string>
                {
                    ["PK"] = conversation["PK"],
                    ["SK"] = $"#DD#{firstGuid}#DD#{secondGuid}",
                    ["Author"] = "TestyTesterW",
                    ["MessageBody"] = "Second level drill-down post (reply to first)",
                    ["UpdatedAt"] = DateTimeOffset.Parse("1970-01-01T00:00:03Z").ToUnixTimeSeconds().ToString()
                },
                new Dictionary<string, string>
                {
                    ["PK"] = conversation["PK"],
                    ["SK"] = $"#DD#{firstGuid}#DD#{secondGuid}#DD#{thirdGuid}",
                    ["Author"] = "TestyTesterK",
                    ["MessageBody"] = "Third level drill-down post (reply to second)",
                    ["UpdatedAt"] = DateTimeOffset.Parse("1970-01-01T00:00:04Z").ToUnixTimeSeconds().ToString()
                }
            };

            AssertPostsMatchInOrder(drillDownPosts, expectedHierarchy);
        }

        [Fact]
        public async Task AppendCommentPost_SavesCommentSuccessfully()
        {
            // Arrange
            var conversationGuid = GetNewConversationGuid();
            var commentPostGuid = Guid.NewGuid();
            var conversationPK = $"CONVO#{conversationGuid}";
            var parentPostSK = "METADATA";
            var commentPostAuthor = "TestyTesterX";
            var commentPostMessageBody = "This is a comment responding to the conversation";
            var commentPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");
            

            await _db.CreateNewConversation(
                conversationGuid,
                WiseWordsTable.ConvoTypeEnum.QUESTION,
                "Root conversation for comment posts",
                "This is the main conversation that will have comment posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));

            // Act
            var jsonCommentPost = await _db.AppendCommentPost(
                conversationPK,
                parentPostSK,
                commentPostGuid,
                commentPostAuthor,
                commentPostMessageBody,
                commentPostCreationTime);

            // Assert
            var commentFields = DeserialiseToStringDictionary.This(jsonCommentPost);
            
            AssertPostHasStructure(commentFields, conversationPK, $"#CM#{commentPostGuid}", 
                commentPostAuthor, commentPostMessageBody, commentPostCreationTime.ToUnixTimeSeconds());
        }

        [Fact]
        public async Task AppendCommentPost_CreatesCommentsOnDrillDownPostsSuccessfully()
        {
            // Arrange
            var drillDownGuid = Guid.NewGuid();
            var conversationCommentGuid = Guid.NewGuid();
            var drillDownCommentGuid = Guid.NewGuid();
            

            var conversation = await AConversation()
                .WithGuid(GetNewConversationGuid())
                .WithType(WiseWordsTable.ConvoTypeEnum.PROBLEM)
                .WithTitle("Conversation with drill-down posts and comments")
                .WithMessageBody("This conversation will have drill-down posts with comments")
                .WithAuthor("TestyTester")
                .CreateAsync(_db);

            // Act - Create posts using fluent builders
            var conversationComment = await APost()
                .WithGuid(conversationCommentGuid)
                .WithAuthor("TestyTesterW")
                .WithMessageBody("Comment directly on conversation")
                .WithTimestamp(DateTimeOffset.Parse("1970-01-01T00:00:03Z"))
                .CreateCommentAsync(_db, conversation["PK"], conversation["SK"]);

            var drillDownPost = await APost()
                .WithGuid(drillDownGuid)
                .WithAuthor("TestyTesterX")
                .WithMessageBody("This is a drill-down post")
                .WithTimestamp(DateTimeOffset.Parse("1970-01-01T00:00:02Z"))
                .CreateDrillDownAsync(_db, conversation["PK"], conversation["SK"]);

            var drillDownComment = await APost()
                .WithGuid(drillDownCommentGuid)
                .WithAuthor("TestyTesterK")
                .WithMessageBody("Comment on drill-down post")
                .WithTimestamp(DateTimeOffset.Parse("1970-01-01T00:00:04Z"))
                .CreateCommentAsync(_db, drillDownPost["PK"], drillDownPost["SK"]);

            // Assert - Using simplified assertion helpers
            AssertPostHasStructure(drillDownPost, conversation["PK"], $"#DD#{drillDownGuid}", 
                "TestyTesterX", "This is a drill-down post", DateTimeOffset.Parse("1970-01-01T00:00:02Z").ToUnixTimeSeconds());
                
            AssertPostHasStructure(conversationComment, conversation["PK"], $"#CM#{conversationCommentGuid}", 
                "TestyTesterW", "Comment directly on conversation", DateTimeOffset.Parse("1970-01-01T00:00:03Z").ToUnixTimeSeconds());
                
            AssertPostHasStructure(drillDownComment, conversation["PK"], $"#DD#{drillDownGuid}#CM#{drillDownCommentGuid}", 
                "TestyTesterK", "Comment on drill-down post", DateTimeOffset.Parse("1970-01-01T00:00:04Z").ToUnixTimeSeconds());
        }

        [Fact]
        public async Task AppendCommentPost_CannotAppendCommentToComment()
        {
            // Arrange
            
            var jsonConversation = await _db.CreateNewConversation(
                GetNewConversationGuid(),
                WiseWordsTable.ConvoTypeEnum.QUESTION,
                "Conversation for testing comment restrictions",
                "This conversation will test that comments cannot be added to other comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonFirstComment = await _db.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is the first comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var firstCommentFields = DeserialiseToStringDictionary.This(jsonFirstComment);

            // Act & Assert
            var act = async () => await _db.AppendCommentPost(
                firstCommentFields["PK"],
                firstCommentFields["SK"],
                Guid.NewGuid(),
                "TestyTesterW",
                "This comment should fail to be added to the first comment",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Cannot append a Comment post to a Comment or Conclusion post*");
        }

        [Fact]
        public async Task AppendDrillDownPost_CannotAppendDrillDownPostToComment()
        {
            // Arrange
            

            var jsonConversation = await _db.CreateNewConversation(
                GetNewConversationGuid(),
                WiseWordsTable.ConvoTypeEnum.PROBLEM,
                "Conversation for testing drill-down post restrictions",
                "This conversation will test that drill-down posts cannot be added to comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonComment = await _db.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is a comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var commentFields = DeserialiseToStringDictionary.This(jsonComment);

            // Act & Assert
            var act = async () => await _db.AppendDrillDownPost(
                commentFields["PK"],
                commentFields["SK"],
                Guid.NewGuid(),
                "TestyTesterW",
                "This drill-down post should fail to be added to the comment",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Cannot append a DrillDown post to a Comment or Conclusion post*");
        }

        [Fact]
        public async Task AppendConclusionPost_SavesConclusionToConversationSuccessfully()
        {
            // Arrange
            var conversationGuid = GetNewConversationGuid();
            var conclusionPostGuid = Guid.NewGuid();
            var conclusionPostAuthor = "TestyTesterX";
            var conclusionPostMessageBody = "This is a conclusion post responding to the conversation";
            var conclusionPostCreationTime = DateTimeOffset.Parse("1970-01-01T00:00:10Z");
            

            var jsonConversation = await _db.CreateNewConversation(
                conversationGuid,
                WiseWordsTable.ConvoTypeEnum.QUESTION,
                "Root conversation for conclusion posts",
                "This is the main conversation that will have conclusion posts",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            // Act
            var jsonConclusionPost = await _db.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                conclusionPostGuid,
                conclusionPostAuthor,
                conclusionPostMessageBody,
                conclusionPostCreationTime);

            // Assert
            var conclusionFields = DeserialiseToStringDictionary.This(jsonConclusionPost);
            
            AssertPostHasStructure(conclusionFields, $"CONVO#{conversationGuid}", $"#CC#{conclusionPostGuid}", 
                conclusionPostAuthor, conclusionPostMessageBody, conclusionPostCreationTime.ToUnixTimeSeconds());
        }

        [Fact]
        public async Task AppendConclusionPost_SavesConclusionToDrillDownPostSuccessfully()
        {
            // Arrange
            var drillDownPostGuid = Guid.NewGuid();
            var conclusionPostGuid = Guid.NewGuid();
            var conclusionPostTime = DateTimeOffset.Parse("1970-01-01T00:00:03Z");
            var conclusionPostAuthor = "TestyTesterW";
            var conclusionPostMessageBody = "This is a conclusion to the drill-down post";
            

            var jsonConversation = await _db.CreateNewConversation(
                GetNewConversationGuid(),
                WiseWordsTable.ConvoTypeEnum.PROBLEM,
                "Conversation with drill-down posts and conclusions",
                "This conversation will have drill-down posts with conclusions",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonDrillDownPost = await _db.AppendDrillDownPost(
                conversationFields["PK"],
                conversationFields["SK"],
                drillDownPostGuid,
                "TestyTesterX",
                "This is a drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var drillDownPostFields = DeserialiseToStringDictionary.This(jsonDrillDownPost);

            // Act
            var jsonConclusionPost = await _db.AppendConclusionPost(
                drillDownPostFields["PK"],
                drillDownPostFields["SK"],
                conclusionPostGuid,
                conclusionPostAuthor,
                conclusionPostMessageBody,
                conclusionPostTime);

            // Assert
            var conclusionFields = DeserialiseToStringDictionary.This(jsonConclusionPost);
            
            AssertPostHasStructure(conclusionFields, conversationFields["PK"], $"#DD#{drillDownPostGuid}#CC#{conclusionPostGuid}", 
                conclusionPostAuthor, conclusionPostMessageBody, conclusionPostTime.ToUnixTimeSeconds());
        }

        [Fact]
        public async Task AppendConclusionPost_CannotAppendConclusionToComment()
        {
            // Arrange
            

            var jsonConversation = await _db.CreateNewConversation(
                GetNewConversationGuid(),
                WiseWordsTable.ConvoTypeEnum.QUESTION,
                "Conversation for testing conclusion restrictions",
                "This conversation will test that conclusions cannot be added to comments",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonComment = await _db.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is a comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var commentFields = DeserialiseToStringDictionary.This(jsonComment);

            // Act & Assert
            var act = async () => await _db.AppendConclusionPost(
                commentFields["PK"],
                commentFields["SK"],
                Guid.NewGuid(),
                "TestyTesterW",
                "This conclusion should fail to be added to the comment",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Cannot append a Conclusion post to a Comment or Conclusion post*");
        }

        [Fact]
        public async Task AppendConclusionPost_CannotAppendConclusionToConclusion()
        {
            // Arrange
            

            var jsonConversation = await _db.CreateNewConversation(
                GetNewConversationGuid(),
                WiseWordsTable.ConvoTypeEnum.DILEMMA,
                "Conversation for testing conclusion-to-conclusion restrictions",
                "This conversation will test that conclusions cannot be added to other conclusions",
                "TestyTester",
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonFirstConclusion = await _db.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                Guid.NewGuid(),
                "TestyTesterX",
                "This is the first conclusion on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var firstConclusionFields = DeserialiseToStringDictionary.This(jsonFirstConclusion);

            // Act & Assert
            var act = async () => await _db.AppendConclusionPost(
                firstConclusionFields["PK"],
                firstConclusionFields["SK"],
                Guid.NewGuid(),
                "TestyTesterW",
                "This conclusion should fail to be added to the first conclusion",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Cannot append a Conclusion post to a Comment or Conclusion post*");
        }

        [Fact]
        public async Task RetrieveConversationPosts_RetrievesAllPostsSuccessfullyAndInOrder()
        {
            // Arrange
            var conversationGuid = GetNewConversationGuid();
            var drillDownGuid = Guid.NewGuid();
            var commentGuid = Guid.NewGuid();
            var conclusionGuid = Guid.NewGuid();
            var drillDownCommentGuid = Guid.NewGuid();
            var authorPrefix = "TestyWholeConvo";
            

            // Create conversation and various post types
            var jsonConversation = await _db.CreateNewConversation(
                conversationGuid,
                WiseWordsTable.ConvoTypeEnum.PROBLEM,
                "Test conversation with multiple posts",
                "This conversation will have various types of posts",
                authorPrefix,
                DateTimeOffset.Parse("1970-01-01T00:00:01Z"));
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);

            var jsonDrillDown = await _db.AppendDrillDownPost(
                conversationFields["PK"],
                conversationFields["SK"],
                drillDownGuid,
                authorPrefix + "-DD",
                "This is a drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:02Z"));
            var drillDownFields = DeserialiseToStringDictionary.This(jsonDrillDown);

            await _db.AppendCommentPost(
                conversationFields["PK"],
                conversationFields["SK"],
                commentGuid,
                authorPrefix + "-CM",
                "This is a comment on the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:03Z"));

            await _db.AppendConclusionPost(
                conversationFields["PK"],
                conversationFields["SK"],
                conclusionGuid,
                authorPrefix + "-CC",
                "This is a conclusion to the conversation",
                DateTimeOffset.Parse("1970-01-01T00:00:04Z"));

            await _db.AppendCommentPost(
                drillDownFields["PK"],
                drillDownFields["SK"],
                drillDownCommentGuid,
                authorPrefix + "-DDCM",
                "This is a comment on the drill-down post",
                DateTimeOffset.Parse("1970-01-01T00:00:05Z"));

            // Act
            var allPosts = await _db.RetrieveConversationPosts(conversationFields["PK"]);

            // Assert
            var parsedPosts = allPosts.Select(json => DeserialiseToStringDictionary.This(json)).ToList();
            parsedPosts.Should().HaveCount(5);

            // Verify conversation (should be last in sort order)
            var conversation = parsedPosts[4];
            conversation["SK"].Should().Be("METADATA");
            conversation["PK"].Should().Be($"CONVO#{conversationGuid}");
            conversation["Title"].Should().Be("Test conversation with multiple posts");

            // Verify conclusion post (should be first in sort order)
            var conclusionPost = parsedPosts[0];
            conclusionPost["SK"].Should().Be($"#CC#{conclusionGuid}");
            conclusionPost["PK"].Should().Be(conversation["PK"]);
            conclusionPost["MessageBody"].Should().Be("This is a conclusion to the conversation");

            // Verify comment post (should be second in sort order)
            var commentPost = parsedPosts[1];
            commentPost["SK"].Should().Be($"#CM#{commentGuid}");
            commentPost["PK"].Should().Be(conversation["PK"]);
            commentPost["MessageBody"].Should().Be("This is a comment on the conversation");

            // Verify drill-down post (should be third in sort order)
            var drillDownPost = parsedPosts[2];
            drillDownPost["SK"].Should().Be($"#DD#{drillDownGuid}");
            drillDownPost["PK"].Should().Be(conversation["PK"]);
            drillDownPost["MessageBody"].Should().Be("This is a drill-down post");

            // Verify drill-down comment post (should be fourth in sort order)
            var drillDownCommentPost = parsedPosts[3];
            drillDownCommentPost["SK"].Should().Be($"#DD#{drillDownGuid}#CM#{drillDownCommentGuid}");
            drillDownCommentPost["PK"].Should().Be(conversation["PK"]);
            drillDownCommentPost["MessageBody"].Should().Be("This is a comment on the drill-down post");
        }

        [Fact]
        public async Task RetrieveConversationPosts_ReturnsEmptyListForNonExistentConversation()
        {
            // Arrange
            var nonExistentConversationPK = $"CONVO#{Guid.NewGuid()}";
            

            // Act
            var posts = await _db.RetrieveConversationPosts(nonExistentConversationPK);

            // Assert
            posts.Should().BeEmpty();
        }

        [Fact]
        public async Task RetrieveConversationPosts_InvalidConversationPkParameterFails()
        {
            // Arrange
            

            // Act & Assert - Invalid PK format
            var actInvalid = async () => await _db.RetrieveConversationPosts("INVALID_PK");
            await actInvalid.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Conversation PK must start with 'CONVO#'*");

            // Act & Assert - Null PK
            #pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type.
            var actNull = async () => await _db.RetrieveConversationPosts(null);
            #pragma warning restore CS8625 // Cannot convert null literal to non-nullable reference type.
            await actNull.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Conversation PK cannot be null or empty*");

            // Act & Assert - Empty PK
            var actEmpty = async () => await _db.RetrieveConversationPosts("");
            await actEmpty.Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Conversation PK cannot be null or empty*");
        }

        [Fact]
        public async Task DeleteConversationAndPosts_DeletesAllItemsSuccessfully()
        {
            // Arrange
            var conversationGuid = GetNewConversationGuid();
            

            var jsonConversation = await _db.CreateNewConversation(
                conversationGuid,
                WiseWordsTable.ConvoTypeEnum.QUESTION,
                "Test Deletion",
                "This conversation should be deleted.",
                "DeletionTester",
                DateTimeOffset.UtcNow);
            var conversationFields = DeserialiseToStringDictionary.This(jsonConversation);
            var conversationPK = conversationFields["PK"];

            await _db.AppendCommentPost(
                conversationPK,
                "METADATA",
                Guid.NewGuid(),
                "Commenter",
                "This comment should also be deleted.",
                DateTimeOffset.UtcNow);

            // Act
            await _db.AdministrativeNonAtomicDeleteConversationAndPosts(conversationPK);

            // Assert
            var posts = await _db.RetrieveConversationPosts(conversationPK);
            posts.Should().BeEmpty();
        }

        private Guid GetNewConversationGuid()
        {
            var guid = Guid.NewGuid();
            _dbCleanupConversationPostTest.Enqueue($"CONVO#{guid}");

            return guid;
        }
 
        
        private static void AssertPostMatches(Dictionary<string, string> actual, Dictionary<string, string> expected, PostType postType = PostType.Post)
        {
            actual["PK"].Should().Be(expected["PK"]);
            actual["SK"].Should().Be(expected["SK"]);
            actual["Author"].Should().Be(expected["Author"]);
            actual["MessageBody"].Should().Be(expected["MessageBody"]);
            actual["UpdatedAt"].Should().Be(expected["UpdatedAt"]);
            
            if (postType != PostType.Conversation)
            {
                actual.Should().NotContainKeys("UpdatedAtYear", "ConvoType", "Title");
            }
        }
        
        private static void AssertConversationMatches(Dictionary<string, string> actual, Dictionary<string, string> expected)
        {
            var conversationFields = new[] { "PK", "SK", "Author", "Title", "ConvoType", "MessageBody", "UpdatedAt", "UpdatedAtYear" };
            actual.Should().ContainKeys(conversationFields);
            
            foreach (var field in conversationFields)
            {
                actual[field].Should().Be(expected[field], $"Field {field} should match");
            }
        }
        
        private static void AssertPostHasStructure(Dictionary<string, string> actual, string expectedPK, string expectedSK, string expectedAuthor, string expectedMessage, long expectedTimestamp)
        {
            var expected = new Dictionary<string, string>
            {
                ["PK"] = expectedPK,
                ["SK"] = expectedSK,
                ["Author"] = expectedAuthor,
                ["MessageBody"] = expectedMessage,
                ["UpdatedAt"] = expectedTimestamp.ToString()
            };
            AssertPostMatches(actual, expected);
        }
        
        private static void AssertPostsMatchInOrder(List<Dictionary<string, string>> actualPosts, Dictionary<string, string>[] expectedPosts)
        {
            actualPosts.Should().HaveCount(expectedPosts.Length);
            for (int i = 0; i < actualPosts.Count; i++)
            {
                AssertPostMatches(actualPosts[i], expectedPosts[i]);
            }
        }

        public async Task DisposeAsync()
        {
            
            while (_dbCleanupConversationPostTest.Count > 0)
            {
                await _db.AdministrativeNonAtomicDeleteConversationAndPosts(_dbCleanupConversationPostTest.Dequeue());
            }
            
        }

    }
 
}