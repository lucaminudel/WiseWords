using Amazon.DynamoDBv2.DataModel;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.DataStore
{
    public partial class ConversationsAndPosts 
    {
        [DynamoDBTable("WiseWordsTable")] 
        private class PostSerialiser
        {

            public PostSerialiser() { }

            public PostSerialiser(string json)
            {

                if (string.IsNullOrEmpty(json))
                    throw new ArgumentException("The value is null or emplty, it should be a valid jsan", nameof(json));

                var conversation = JsonSerializer.Deserialize<PostSerialiser>(json);
                if (conversation == null)
                    throw new ArgumentOutOfRangeException(nameof(json), "The value has been serialised to a null value, it is probaly invalid");

                PK = conversation.PK;
                SK = conversation.SK;
                MessageBody = conversation.MessageBody;
                Author = conversation.Author;
                UpdatedAt = conversation.UpdatedAt;
            }

            [DynamoDBHashKey]
            public string PK { get; set; } = string.Empty;

            [DynamoDBRangeKey]
            public string SK { get; set; } = string.Empty;

            public string MessageBody { get; set; } = string.Empty;
            public string Author { get; set; } = string.Empty;
            public long UpdatedAt { get; set; } = -1;

            public override string ToString()
            {
                return JsonSerializer.Serialize(this, new JsonSerializerOptions 
                { 
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.WriteAsString
                });
            }
        }


    }

}


