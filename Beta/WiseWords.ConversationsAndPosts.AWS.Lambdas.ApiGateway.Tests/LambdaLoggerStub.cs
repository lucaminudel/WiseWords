using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

public class LambdaLoggerStub : ILoggerObserver
{
    public void OnFailure(string message, ILambdaContext context, string errorDetails)
    {
    }

    public void OnSuccess(string message, ILambdaContext context)
    {
    }

    public void OnStart(string message, ILambdaContext context)
    {
    }

    public void OnFailure(string message, ILambdaContext context, Exception ex)
    {
    }

    public void OnWarning(string message, ILambdaContext context)
    {
        throw new NotImplementedException();
    }
}
