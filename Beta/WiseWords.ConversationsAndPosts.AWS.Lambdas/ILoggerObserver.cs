using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas;

public interface ILoggerObserver
{
    void OnStart(string message, ILambdaContext context);
    void OnSuccess(string message, ILambdaContext context);
    void OnError(string message, ILambdaContext context, string errorDetails);
    void OnError(string message, ILambdaContext context, Exception ex);
}