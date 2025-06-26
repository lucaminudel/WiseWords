using Newtonsoft.Json;

namespace WiseWordsSpikeA.DynamoDbAccessCode
{
    public partial class ConversationsAndPosts
    {
        private class ConversationSerialiser : PostSerialiser
        {

            public ConversationSerialiser() { }

            public ConversationSerialiser(string json) : base(json)
            {
                var conversation = JsonConvert.DeserializeObject<ConversationSerialiser>(json);
                ConvoType = conversation.ConvoType;
                Title = conversation.Title;
                UpdatedAtYear = conversation.UpdatedAtYear;
            }

            public string ConvoType { get; set; }
            public string Title { get; set; }
            public int UpdatedAtYear { get; set; }

            public override string ToString()
            {
                return JsonConvert.SerializeObject(this, Formatting.Indented);
            }
        }
        

    }

}


