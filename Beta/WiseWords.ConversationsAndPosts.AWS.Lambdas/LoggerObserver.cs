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

    public void OnFailure(string message, ILambdaContext context, string errorDetails)
        => context.Logger.LogLine($"[{_prefix} failure] {message}, {errorDetails}");
    public void OnFailure(string message, ILambdaContext context, Exception ex)
        =>  OnFailure(message, context, $"Exception: {ex.GetType()} {ex.Message} StackTrace: {ex.StackTrace}");

    public void OnWarning(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} WARNING] {message}");
}