using Amazon.DynamoDBv2.DataModel;
using Newtonsoft.Json;

namespace DynamoDbAccessCode
{
    public partial class ConversationsAndPosts
    {
        [DynamoDBTable("WiseWordsTable")] // Replace with your DynamoDB table name
        private class ConversationSerialiser
        {

            public ConversationSerialiser() { }

            public ConversationSerialiser(string json)
            {
                var conversation = JsonConvert.DeserializeObject<ConversationSerialiser>(json);
                PK = conversation.PK;
                SK = conversation.SK;
                ConvoType = conversation.ConvoType;
                Title = conversation.Title;
                MessageBody = conversation.MessageBody;
                Author = conversation.Author;
                UpdatedAt = conversation.UpdatedAt;
                UpdatedAtYear = conversation.UpdatedAtYear;
            }

            [DynamoDBHashKey]
            public string PK { get; set; }

            [DynamoDBRangeKey]
            public string SK { get; set; }

            public string ConvoType { get; set; }
            public string Title { get; set; }
            public string MessageBody { get; set; }
            public string Author { get; set; }
            public long UpdatedAt { get; set; }
            public int UpdatedAtYear { get; set; }

            public override string ToString()
            {
                return JsonConvert.SerializeObject(this, Formatting.Indented);
            }
        }

    }

}


