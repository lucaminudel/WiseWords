using Amazon.Lambda.Core;

namespace SpikeB.WiseWordsAWSLambdaFacade;

public interface IHandlerObserver
{
    void OnStart(string message, ILambdaContext context);
    void OnSuccess(string message, ILambdaContext context);
    void OnError(string message, ILambdaContext context, Exception ex);
}