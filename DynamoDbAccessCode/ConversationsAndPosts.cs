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

        public async Task<string> CreateNewConversation(Guid newGuid, ConvoTypeEnum convoType, string title, string messageBody, string author, DateTimeOffset utcNow)
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

            var utcNowUnixTimestamp = utcNow.ToUnixTimeSeconds();
            var updateAt = utcNowUnixTimestamp;
            var updatedAtYear = utcNow.Year;

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


