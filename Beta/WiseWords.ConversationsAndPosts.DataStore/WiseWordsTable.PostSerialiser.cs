using Amazon.DynamoDBv2.DataModel;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.DataStore
{
    public partial class WiseWordsTable 
    {
        [DynamoDBTable("WiseWordsTable")] 
        private class PostSerialiser
        {

            public PostSerialiser() { }

            public PostSerialiser(string json)
            {
                Copy(From<PostSerialiser>(json)!);
            }

            protected T From<T>(string json)
            {
                JsonValidation(json);

                var post = JsonSerializer.Deserialize<T>(json);
                PostValidation<T>(post, nameof(json));

                return post!;
            }

            protected void Copy(PostSerialiser source)
            {
                PK = source.PK;
                SK = source.SK;
                MessageBody = source.MessageBody;
                Author = source.Author;
                UpdatedAt = source.UpdatedAt;                
            }

            protected static void PostValidation<T>(T? post, string fieldName)
            {
                if (post == null)
                    throw new ArgumentOutOfRangeException(fieldName, "The value has been serialised to a null value, it is probably invalid");
            }

            protected static void JsonValidation(string json)
            {
                if (string.IsNullOrEmpty(json))
                    throw new ArgumentException("The value is null or empty, it should be a valid json", nameof(json));
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
                return JsonSerializer.Serialize(this, this.GetType(), new JsonSerializerOptions 
                { 
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.WriteAsString
                });
            }
        }


    }

}


