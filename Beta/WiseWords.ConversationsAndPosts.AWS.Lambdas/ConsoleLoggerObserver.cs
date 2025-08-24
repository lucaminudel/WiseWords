using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public class ConsoleLoggerObserver : ILoggerObserver
{

    private readonly string _prefix;
    public ConsoleLoggerObserver(string logPrefix)
    {
        _prefix = logPrefix;
    }

    public void OnStart(string message, ILambdaContext context)
        => Console.WriteLine($"[start] {message}");

    public void OnSuccess(string message, ILambdaContext context)
        => Console.WriteLine($"[success] {message}");

    public void OnFailure(string message, ILambdaContext context, Exception ex)
        => OnFailure(message, context, $"Exception: {ex.Message} StackTrace: {ex.StackTrace}");

    public void OnFailure(string message, ILambdaContext context, string errorDetails)
        => Console.WriteLine($"[{_prefix} failure] {message}, {errorDetails}");

    public void OnWarning(string message, ILambdaContext context)
        => context.Logger.LogLine($"[{_prefix} WARNING] {message}");
}