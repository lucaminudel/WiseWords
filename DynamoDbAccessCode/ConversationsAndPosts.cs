using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;

namespace DynamoDbAccessCode
{
    public partial class ConversationsAndPosts
    {
        // Constants for magic strings
        private const string TABLE_NAME = "WiseWordsTable";
        private const string GSI_NAME = "GSI1_LowTraffic_ConversationsByYear";
        private const string SERVICE_URL = "http://localhost:8000";
        private const string DUMMY_AWS_ACCESS_KEY_ID = "dummy";
        private const string DUMMY_AWS_SECRET_ACCESS_KEY = "dummy";
        private const string CONVERSATION_PK_PREFIX = "CONVO#";
        private const string CONVERSATION_SK_METADATA = "METADATA";
        private const string DRILL_DOWN_POST_SK_PREFIX = "DD";
        private const string COMMENT_POST_SK_PREFIX = "CM";
        

        public enum ConvoTypeEnum
        {
            QUESTION,
            PROBLEM,
            DILEMMA
        }

        public async Task<string> CreateNewConversation(Guid newGuid, ConvoTypeEnum convoType, string title, string messageBody, string author, DateTimeOffset utcCreationTime)
        {
            CommonFieldsValidation("Conversation", newGuid, messageBody, author);

            if (!Enum.IsDefined(typeof(ConvoTypeEnum), convoType))
                throw new ArgumentException("Invalid conversation type", nameof(convoType));

            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Title cannot be null or empty", nameof(title));


            var utcCreationTimeUnixTimestamp = utcCreationTime.ToUnixTimeSeconds();
            var updateAt = utcCreationTimeUnixTimestamp;
            var updatedAtYear = utcCreationTime.Year;

            var conversation = new ConversationSerialiser
            {
                PK = CONVERSATION_PK_PREFIX + newGuid.ToString(),
                SK = CONVERSATION_SK_METADATA,
                ConvoType = convoType.ToString(),
                Title = title,
                MessageBody = messageBody,
                Author = author,
                UpdatedAt = updateAt,
                UpdatedAtYear = updatedAtYear
            };

            await AsyncExecuteWithDynamoDB(async (client, context) =>
            {
                await context.SaveAsync(conversation);
            });

            return conversation.ToString();
        }


        public async Task<List<string>> RetrieveConversations(int updatedAtYear, string filterByauthor = "")
        {
            if (updatedAtYear < 1970)
                throw new ArgumentException("Invalid year", nameof(updatedAtYear));

            List<Document> documents = new List<Document>();

            await AsyncExecuteWithDynamoDB(async (client, context) =>
            {            
                var queryConfig = new QueryOperationConfig
                {
                    IndexName = GSI_NAME,
                    KeyExpression = new Expression
                    {
                        ExpressionStatement = "#uay = :uay",
                        ExpressionAttributeNames = new Dictionary<string, string> { { "#uay", "UpdatedAtYear" } },
                        ExpressionAttributeValues = new Dictionary<string, DynamoDBEntry> { { ":uay", updatedAtYear } }
                    },
                    Select = SelectValues.SpecificAttributes,
                    AttributesToGet = new List<string> { "PK", "Author", "Title", "ConvoType", "UpdatedAtYear", "UpdatedAt" }
                };

                if (string.IsNullOrEmpty(filterByauthor) == false)
                {
                    queryConfig.FilterExpression = new Expression
                    {
                        ExpressionStatement = "#author = :author",
                        ExpressionAttributeNames = new Dictionary<string, string> { { "#author", "Author" } },
                        ExpressionAttributeValues = new Dictionary<string, DynamoDBEntry> { { ":author", filterByauthor } }
                    };
                }

                var table = new TableBuilder(client, TABLE_NAME)
                    .AddHashKey("PK", DynamoDBEntryType.String)
                    .AddRangeKey("SK", DynamoDBEntryType.String)
                    .Build();
                var search = table.Query(queryConfig);
                
                documents = await search.GetNextSetAsync();

            });

            var jsonResults = documents.Select(doc => doc.ToJson()).ToList();
            return jsonResults;

        }

        public async Task<string> AppendDrillDownPost(string conversationPK, string parentPostSK, Guid newPostGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
        {
            return await AppendPost(DRILL_DOWN_POST_SK_PREFIX, "DrillDown", conversationPK, parentPostSK, newPostGuid, author, messageBody, utcCreationTime);
        }

        public async Task<string> AppendCommentPost(string conversationPK, string parentPostSK, Guid newCommentGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
        {
            return await AppendPost(COMMENT_POST_SK_PREFIX, "Comment", conversationPK, parentPostSK, newCommentGuid, author, messageBody, utcCreationTime);
        }

        private async Task<string> AppendPost(string postType, string postTypeName, string conversationPK, string parentPostSK, Guid newGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
        {
            CommonFieldsValidation(postTypeName, newGuid, messageBody, author);

            if (string.IsNullOrEmpty(conversationPK))
                throw new ArgumentException("Conversation PK cannot be null or empty", nameof(conversationPK));

            if (!conversationPK.StartsWith(CONVERSATION_PK_PREFIX))
                throw new ArgumentException($"Conversation PK must start with '{CONVERSATION_PK_PREFIX}'", nameof(conversationPK));

            if (parentPostSK == CONVERSATION_SK_METADATA) { parentPostSK = ""; }

            if (parentPostSK.LastIndexOf($"#{COMMENT_POST_SK_PREFIX}#") != -1 || parentPostSK.LastIndexOf($"#{CONVERSATION_PK_PREFIX}") != -1)
                throw new ArgumentException($"Parent Post SK tree's path must not contain '#{COMMENT_POST_SK_PREFIX}#' or '#{CONVERSATION_PK_PREFIX}'", nameof(parentPostSK));

            var parts = parentPostSK.Split('#', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length % 2 != 0) throw new ArgumentException("Parent Post SK tree's path has one malformed post id", nameof(parentPostSK));
            Enumerable.Range(0, parts.Length / 2).ToList().ForEach(i =>
                {
                    if (parts[i * 2] != DRILL_DOWN_POST_SK_PREFIX || !Guid.TryParse(parts[i * 2 + 1], out _))
                        throw new ArgumentException("Parent Post SK tree's path has invalid post type or invalid guid", nameof(parentPostSK));
                }); 

            var post = new PostSerialiser
            {
                PK = conversationPK,
                SK = $"{parentPostSK}#{postType}#{newGuid}",
                MessageBody = messageBody,
                Author = author,
                UpdatedAt = utcCreationTime.ToUnixTimeSeconds()
            };

            await AsyncExecuteWithDynamoDB(async (client, context) =>
            {
                await context.SaveAsync(post);
            });

            return post.ToString();
        }

        private static void CommonFieldsValidation(string postTypeName, Guid newGuid, string messageBody, string author)
        {
            if (newGuid == Guid.Empty)
                throw new ArgumentException($"New {postTypeName} post GUID cannot be empty", nameof(newGuid));

            if (string.IsNullOrWhiteSpace(author))
                throw new ArgumentException("Author cannot be null or empty", nameof(author));

            if (string.IsNullOrWhiteSpace(messageBody))
                throw new ArgumentException("Message body cannot be null or empty", nameof(messageBody));
        }


        private static async Task AsyncExecuteWithDynamoDB(Func<AmazonDynamoDBClient, DynamoDBContext, Task> action)
        {
            var clientConfig = new AmazonDynamoDBConfig
            {
                ServiceURL = SERVICE_URL,
                // RegionEndpoint intentionally omitted for DynamoDB Local
            };

            using (var client = new AmazonDynamoDBClient(DUMMY_AWS_ACCESS_KEY_ID, DUMMY_AWS_SECRET_ACCESS_KEY, clientConfig))
            using (var context = new DynamoDBContextBuilder().WithDynamoDBClient(() => client).Build())
            {
                await action(client, context);
            }
        }

    }
}


