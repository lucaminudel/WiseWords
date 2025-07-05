using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.DataStore
{
    public partial class ConversationsAndPosts
    {
        private class ConversationSerialiser : PostSerialiser
        {

            public ConversationSerialiser() { }

            public ConversationSerialiser(string json) : base(json)
            {
                if (string.IsNullOrEmpty(json))
                    throw new ArgumentException("The value is null or emplty, it should be a valid jsan", nameof(json));

                var conversation = JsonSerializer.Deserialize<ConversationSerialiser>(json);
                if (conversation == null)
                    throw new ArgumentOutOfRangeException(nameof(json), "The value has been serialised to a null value, it is probaly invalid");

                ConvoType = conversation.ConvoType;
                Title = conversation.Title;
                UpdatedAtYear = conversation.UpdatedAtYear;
            }

            public string ConvoType { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public int UpdatedAtYear { get; set; } = -1;

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


