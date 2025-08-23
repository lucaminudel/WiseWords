using Amazon.Lambda.Core;

namespace WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.Tests;

public class LambdaContextStub : ILambdaContext
{
    public string AwsRequestId { get; set; } = string.Empty;
    public IClientContext ClientContext => null!;
    public string FunctionName { get; } = "";
    public string FunctionVersion { get; } = "1";
    public ICognitoIdentity Identity => null!;
    public string InvokedFunctionArn { get; } = "";
    public ILambdaLogger Logger { get; } = null!;
    public string LogGroupName { get; } = "";
    public string LogStreamName { get; } = "";
    public int MemoryLimitInMB { get; } =0;
    public TimeSpan RemainingTime => TimeSpan.Zero;
}
