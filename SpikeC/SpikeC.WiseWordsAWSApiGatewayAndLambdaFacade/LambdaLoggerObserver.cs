using Amazon.Lambda.Core;

namespace SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade;

public class LambdaLoggerObserver : IHandlerObserver
{
    public void OnStart(string message, ILambdaContext context)
        => context.Logger.LogLine($"[start] {message}");

    public void OnSuccess(string message, ILambdaContext context)
        => context.Logger.LogLine($"[success] {message}");

    public void OnError(string message, ILambdaContext context, Exception ex)
        => context.Logger.LogLine($"[error] {message} Exception: {ex.Message} StackTrace: {ex.StackTrace}");
}