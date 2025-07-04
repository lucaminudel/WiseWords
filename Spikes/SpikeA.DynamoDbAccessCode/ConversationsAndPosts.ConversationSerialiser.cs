using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWordsSpikeA.DynamoDbAccessCode
{
    public partial class ConversationsAndPosts
    {
        private class ConversationSerialiser : PostSerialiser
        {

            public ConversationSerialiser() { }

            public ConversationSerialiser(string json) : base(json)
            {
                var conversation = JsonSerializer.Deserialize<ConversationSerialiser>(json);
                ConvoType = conversation.ConvoType;
                Title = conversation.Title;
                UpdatedAtYear = conversation.UpdatedAtYear;
            }

            public string ConvoType { get; set; }
            public string Title { get; set; }
            public int UpdatedAtYear { get; set; }

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


