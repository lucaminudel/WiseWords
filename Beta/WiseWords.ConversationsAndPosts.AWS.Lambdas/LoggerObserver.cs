using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class LoggerObserver : ILoggerObserver
{
    private readonly string _prefix;
    public LoggerObserver(string logPrefix)
    {
        _prefix = logPrefix;
    }
    public void OnStart(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} start] {message}");

    public void OnSuccess(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} success] {message}");

    public void OnError(string message, ILambdaContext context, string errorDetails)
        => context.Logger.LogLine($"[{_prefix} error] {message}, {errorDetails}");
    public void OnError(string message, ILambdaContext context, Exception ex)
        =>  OnError(message, context, $"Exception: {ex.Message} StackTrace: {ex.StackTrace}");

}