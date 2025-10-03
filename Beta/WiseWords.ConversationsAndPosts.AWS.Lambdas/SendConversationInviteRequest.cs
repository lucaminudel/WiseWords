using System;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class SendConversationInviteRequest
{
    public string ConversationPK { get; set; } = string.Empty;
    public string SenderUsername { get; set; } = string.Empty; 
    public string InviteeName { get; set; } = string.Empty;
    public string InviteeEmail { get; set; } = string.Empty;

}
