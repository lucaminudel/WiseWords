using System.Text.Json;

namespace WiseWordsSpikeA.DynamoDbAccessCode.Tests
{
    internal static class TestDataBuilders
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.WriteAsString | System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
        };
        
        private static readonly DateTimeOffset BaseTime = DateTimeOffset.Parse("1970-01-01T00:00:01Z");
        
        private static Dictionary<string, string> DeserializeToStringDictionary(string json)
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions);
        }

        public abstract class BaseBuilder<T> where T : BaseBuilder<T>
        {
            protected Guid? _guid = null; // Made nullable to force explicit setting
            protected string _author = "TestAuthor";
            protected string _messageBody = "Test message";
            protected DateTimeOffset _timestamp = BaseTime;

            public T WithGuid(Guid guid) { _guid = guid; return (T)this; }
            public T WithAuthor(string author) { _author = author; return (T)this; }
            public T WithMessageBody(string messageBody) { _messageBody = messageBody; return (T)this; }
            public T WithTimestamp(DateTimeOffset timestamp) { _timestamp = timestamp; return (T)this; }
            
            protected static Dictionary<string, string> ParseResult(string json) => DeserializeToStringDictionary(json);
            
            protected void ValidateGuidIsSet()
            {
                if (_guid == null)
                    throw new InvalidOperationException("GUID must be set using WithGuid() before creating. Use GetNewConversationGuid() for proper cleanup registration.");
            }
        }

        public class ConversationBuilder : BaseBuilder<ConversationBuilder>
        {
            private ConversationsAndPosts.ConvoTypeEnum _type = ConversationsAndPosts.ConvoTypeEnum.QUESTION;
            private string _title = "Test Conversation";

            public ConversationBuilder WithType(ConversationsAndPosts.ConvoTypeEnum type) { _type = type; return this; }
            public ConversationBuilder WithTitle(string title) { _title = title; return this; }

            public async Task<Dictionary<string, string>> CreateAsync(ConversationsAndPosts db)
            {
                ValidateGuidIsSet();
                var json = await db.CreateNewConversation(_guid.Value, _type, _title, _messageBody, _author, _timestamp);
                return ParseResult(json);
            }
        }

        public class PostBuilder : BaseBuilder<PostBuilder>
        {
            public async Task<Dictionary<string, string>> CreateDrillDownAsync(ConversationsAndPosts db, string parentPK, string parentSK)
            {
                ValidateGuidIsSet();
                var json = await db.AppendDrillDownPost(parentPK, parentSK, _guid.Value, _author, _messageBody, _timestamp);
                return ParseResult(json);
            }

            public async Task<Dictionary<string, string>> CreateCommentAsync(ConversationsAndPosts db, string parentPK, string parentSK)
            {
                ValidateGuidIsSet();
                var json = await db.AppendCommentPost(parentPK, parentSK, _guid.Value, _author, _messageBody, _timestamp);
                return ParseResult(json);
            }

            public async Task<Dictionary<string, string>> CreateConclusionAsync(ConversationsAndPosts db, string parentPK, string parentSK)
            {
                ValidateGuidIsSet();
                var json = await db.AppendConclusionPost(parentPK, parentSK, _guid.Value, _author, _messageBody, _timestamp);
                return ParseResult(json);
            }
        }

        public class DrillDownHierarchyBuilder
        {
            private readonly List<PostBuilder> _postBuilders = new();
            private Dictionary<string, string> _conversation;

            public DrillDownHierarchyBuilder WithConversation(Dictionary<string, string> conversation)
            {
                _conversation = conversation;
                return this;
            }

            public DrillDownHierarchyBuilder AddLevel(Guid guid, string author, string message, DateTimeOffset timestamp)
            {
                _postBuilders.Add(new PostBuilder().WithGuid(guid).WithAuthor(author).WithMessageBody(message).WithTimestamp(timestamp));
                return this;
            }

            public async Task<List<Dictionary<string, string>>> BuildAsync(ConversationsAndPosts db)
            {
                var results = new List<Dictionary<string, string>>();
                var currentPK = _conversation["PK"];
                var currentSK = _conversation["SK"];

                foreach (var postBuilder in _postBuilders)
                {
                    var post = await postBuilder.CreateDrillDownAsync(db, currentPK, currentSK);
                    results.Add(post);
                    currentSK = post["SK"]; // Next post will be nested under this one
                }

                return results;
            }
        }

        // Factory methods for creating builders
        public static ConversationBuilder AConversation() => new();
        public static PostBuilder APost() => new();
        public static DrillDownHierarchyBuilder ADrillDownHierarchy() => new();
    }
}