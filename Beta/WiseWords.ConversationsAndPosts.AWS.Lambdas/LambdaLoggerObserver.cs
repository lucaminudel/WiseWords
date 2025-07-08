using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class LambdaLoggerObserver : IHandlerObserver
{
    private readonly string _prefix;
    public LambdaLoggerObserver(string logPrefix) 
    {
        _prefix = logPrefix;
    }
    public void OnStart(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} start] {message}");

    public void OnSuccess(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} success] {message}");

    public void OnError(string message, ILambdaContext context, Exception ex)
        => context.Logger.LogLine($"[{_prefix} error] {message} Exception: {ex.Message} StackTrace: {ex.StackTrace}");
}