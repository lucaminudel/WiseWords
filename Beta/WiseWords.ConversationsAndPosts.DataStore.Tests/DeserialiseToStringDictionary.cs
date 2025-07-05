using System.Text.Json;
using System.Text.Json.Serialization;

namespace WiseWords.ConversationsAndPosts.DataStore.Tests;

public static class DeserialiseToStringDictionary
{
    public static Dictionary<string, string> This(string json)
    {
        if (string.IsNullOrEmpty(json))
            throw new ArgumentNullException(nameof(json), "The value provided is either null or emplty.");

        var keyValueDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions);
        if (keyValueDictionary == null || keyValueDictionary.Count == 0)
            throw new ArgumentOutOfRangeException(nameof(json), "The value provided is malformed.");

        return keyValueDictionary;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        NumberHandling = JsonNumberHandling.WriteAsString | JsonNumberHandling.AllowReadingFromString
    };

}
