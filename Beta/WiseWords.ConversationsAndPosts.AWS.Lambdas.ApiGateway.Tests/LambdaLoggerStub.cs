using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

public class LambdaLoggerStub : ILoggerObserver
{
    public void OnError(string message, ILambdaContext context, string errorDetails)
    {
    }

    public void OnSuccess(string message, ILambdaContext context)
    {
    }

    public void OnStart(string message, ILambdaContext context)
    {
    }

    public void OnError(string message, ILambdaContext context, Exception ex)
    {
    }
}
