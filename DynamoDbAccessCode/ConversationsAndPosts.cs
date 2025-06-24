using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;

namespace DynamoDbAccessCode
{
    public partial class ConversationsAndPosts
    {
        public enum ConvoTypeEnum
        {
            QUESTION,
            PROBLEM,
            DILEMMA
        }

        public async Task<string> CreateNewConversation(Guid newGuid, ConvoTypeEnum convoType, string title, string messageBody, string author, DateTimeOffset utcCreationTime)
        {
            if (newGuid == Guid.Empty)
                throw new ArgumentException("Guid cannot be empty", nameof(newGuid));

            if (string.IsNullOrWhiteSpace(author))
                throw new ArgumentException("Author cannot be null or empty", nameof(author));

            if (!Enum.IsDefined(typeof(ConvoTypeEnum), convoType))
                throw new ArgumentException("Invalid conversation type", nameof(convoType));

            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Title cannot be null or empty", nameof(title));
                 
            if (string.IsNullOrWhiteSpace(messageBody))
                throw new ArgumentException("Message body cannot be null or empty", nameof(messageBody));

            var utcCreationTimeUnixTimestamp = utcCreationTime.ToUnixTimeSeconds();
            var updateAt = utcCreationTimeUnixTimestamp;
            var updatedAtYear = utcCreationTime.Year;

            var conversation = new ConversationSerialiser
            {
                PK = "CONVO#" + newGuid.ToString(),
                SK = "METADATA",
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
                    IndexName = "GSI1_LowTraffic_ConversationsByYear",
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

                var table = new TableBuilder(client, "WiseWordsTable")
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
            if (string.IsNullOrEmpty(conversationPK))
                throw new ArgumentException("Conversation PK cannot be null or empty", nameof(conversationPK));

            if (!conversationPK.StartsWith("CONVO#"))
                throw new ArgumentException("Conversation PK must start with 'CONVO#'", nameof(conversationPK));

            if (parentPostSK == "METADATA") { parentPostSK = ""; }

            if (parentPostSK.LastIndexOf("#CM#") != -1 || parentPostSK.LastIndexOf("#CONVO#") != -1)
                throw new ArgumentException("Parent Post SK tree's path must not contain '#CM#' or '#CONVO#'", nameof(parentPostSK));

            var parts = parentPostSK.Split('#', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length % 2 != 0) throw new ArgumentException("Parent Post SK tree's path has one malformed post id", nameof(parentPostSK));
            Enumerable.Range(0, parts.Length / 2).ToList().ForEach(i =>
                {
                    if (parts[i * 2] != "DD" || !Guid.TryParse(parts[i * 2 + 1], out _))
                        throw new ArgumentException("Parent Post SK tree's path has invalid post type or invalid guid", nameof(parentPostSK));
                }); 

            if (newPostGuid == Guid.Empty)
                throw new ArgumentException("Post GUID cannot be empty", nameof(newPostGuid));

            if (string.IsNullOrEmpty(author))
                throw new ArgumentException("Author cannot be null or empty", nameof(author));

            if (string.IsNullOrEmpty(messageBody))
                throw new ArgumentException("Message body cannot be null or empty", nameof(messageBody));


            var drillDownPost = new PostSerialiser
            {
                PK = conversationPK,
                SK = $"{parentPostSK}#DD#{newPostGuid}",
                MessageBody = messageBody,
                Author = author,
                UpdatedAt = utcCreationTime.ToUnixTimeSeconds()
            };

            await AsyncExecuteWithDynamoDB(async (client, context) =>
            {
                await context.SaveAsync(drillDownPost);
            });

            return drillDownPost.ToString();
        }

        public async Task<string> AppendCommentPost(string conversationPK, string parentPostSK, Guid newCommentGuid, string author, string messageBody, DateTimeOffset utcCreationTime)
        {
            if (string.IsNullOrEmpty(conversationPK))
                throw new ArgumentException("Conversation PK cannot be null or empty", nameof(conversationPK));

            if (!conversationPK.StartsWith("CONVO#"))
                throw new ArgumentException("Conversation PK must start with 'CONVO#'", nameof(conversationPK));

            if (parentPostSK == "METADATA") { parentPostSK = ""; }

            if (parentPostSK.LastIndexOf("#CM#") != -1 || parentPostSK.LastIndexOf("#CONVO#") != -1)
                throw new ArgumentException("Parent Post SK tree's path must not contain '#CM#' or '#CONVO#'", nameof(parentPostSK));

            var parts = parentPostSK.Split('#', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length % 2 != 0) throw new ArgumentException("Parent Post SK tree's path has one malformed post id", nameof(parentPostSK));
            Enumerable.Range(0, parts.Length / 2).ToList().ForEach(i =>
                {
                    if (parts[i * 2] != "DD" || !Guid.TryParse(parts[i * 2 + 1], out _))
                        throw new ArgumentException("Parent Post SK tree's path has invalid post type or invalid guid", nameof(parentPostSK));
                }); 

            if (newCommentGuid == Guid.Empty)
                throw new ArgumentException("Comment GUID cannot be empty", nameof(newCommentGuid));

            if (string.IsNullOrEmpty(author))
                throw new ArgumentException("Author cannot be null or empty", nameof(author));

            if (string.IsNullOrEmpty(messageBody))
                throw new ArgumentException("Message body cannot be null or empty", nameof(messageBody));

            var commentPost = new PostSerialiser
            {
                PK = conversationPK,
                SK = $"{parentPostSK}#CM#{newCommentGuid}",
                MessageBody = messageBody,
                Author = author,
                UpdatedAt = utcCreationTime.ToUnixTimeSeconds()
            };

            await AsyncExecuteWithDynamoDB(async (client, context) =>
            {
                await context.SaveAsync(commentPost);
            });

            return commentPost.ToString();
        }

        private static async Task AsyncExecuteWithDynamoDB(Func<AmazonDynamoDBClient, DynamoDBContext, Task> action)
        {
            var clientConfig = new AmazonDynamoDBConfig
            {
                ServiceURL = "http://localhost:8000",
                // RegionEndpoint intentionally omitted for DynamoDB Local
            };

            using (var client = new AmazonDynamoDBClient("dummy", "dummy", clientConfig))
            using (var context = new DynamoDBContextBuilder().WithDynamoDBClient(() => client).Build())
            {
                await action(client, context); 
            }
        }

    }
}


