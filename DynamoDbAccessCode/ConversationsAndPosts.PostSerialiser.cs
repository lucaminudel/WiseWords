using Amazon.DynamoDBv2.DataModel;
using Newtonsoft.Json;

namespace DynamoDbAccessCode
{
    public partial class ConversationsAndPosts 
    {
        [DynamoDBTable("WiseWordsTable")] 
        private class PostSerialiser
        {

            public PostSerialiser() { }

            public PostSerialiser(string json)
            {
                var conversation = JsonConvert.DeserializeObject<PostSerialiser>(json);
                PK = conversation.PK;
                SK = conversation.SK;
                MessageBody = conversation.MessageBody;
                Author = conversation.Author;
                UpdatedAt = conversation.UpdatedAt;
            }

            [DynamoDBHashKey]
            public string PK { get; set; }

            [DynamoDBRangeKey]
            public string SK { get; set; }

            public string MessageBody { get; set; }
            public string Author { get; set; }
            public long UpdatedAt { get; set; }

            public override string ToString()
            {
                return JsonConvert.SerializeObject(this, Formatting.Indented);
            }
        }


    }

}


