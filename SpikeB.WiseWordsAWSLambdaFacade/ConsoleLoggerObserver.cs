using Amazon.Lambda.Core;

namespace SpikeB.WiseWordsAWSLambdaFacade;

public class ConsoleLoggerObserver : IHandlerObserver
{
    public void OnStart(string message, ILambdaContext context)
        => Console.WriteLine($"[start] {message}");

    public void OnSuccess(string message, ILambdaContext context)
        => Console.WriteLine($"[success] {message}");

    public void OnError(string message, ILambdaContext context, Exception ex)
        => Console.WriteLine($"[error] {message} Exception: {ex.Message} StackTrace: {ex.StackTrace}");
}