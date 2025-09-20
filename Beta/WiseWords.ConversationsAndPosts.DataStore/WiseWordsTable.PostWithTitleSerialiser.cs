using Amazon.DynamoDBv2.DataModel;
using System.Text.Json;

namespace WiseWords.ConversationsAndPosts.DataStore
{
    public partial class WiseWordsTable
    {
        [DynamoDBTable("WiseWordsTable")]
        private class PostWithTitleSerialiser : PostSerialiser
        {
            public PostWithTitleSerialiser() : base() { }

            public PostWithTitleSerialiser(string json)
            {
                Copy(From<PostWithTitleSerialiser>(json)!);
            }

            protected void Copy(PostWithTitleSerialiser source)
            {
                base.Copy(source);
                Title = source.Title;
            }

            public string Title { get; set; } = string.Empty;
        }
    }
}
