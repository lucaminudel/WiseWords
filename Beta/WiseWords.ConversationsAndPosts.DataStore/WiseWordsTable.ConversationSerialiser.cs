using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.DataStore
{
    public partial class WiseWordsTable
    {
        private class ConversationSerialiser : PostWithTitleSerialiser
        {

            public ConversationSerialiser() { }

            public ConversationSerialiser(string json) 
            {
                Copy(From<ConversationSerialiser>(json)!);
            }

            protected void Copy(ConversationSerialiser source)
            {
                base.Copy(source);
                ConvoType = source.ConvoType;
                UpdatedAtYear = source.UpdatedAtYear;
            }            

            public string ConvoType { get; set; } = string.Empty;

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


