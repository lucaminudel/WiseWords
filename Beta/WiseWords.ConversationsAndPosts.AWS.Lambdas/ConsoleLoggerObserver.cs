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

    public void OnError(string message, ILambdaContext context, Exception ex)
        => OnError(message, context, $"Exception: {ex.Message} StackTrace: {ex.StackTrace}");


    public void OnError(string message, ILambdaContext context, string errorDetails)
        => Console.WriteLine($"[{_prefix} error] {message}, {errorDetails}");

}