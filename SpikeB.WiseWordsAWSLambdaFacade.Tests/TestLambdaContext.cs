using Amazon.Lambda.Core;

namespace SpikeB.WiseWordsAWSLambdaFacade.Tests
{
    public class lambdaCallContext : ILambdaContext
    {
        public string AwsRequestId => Guid.NewGuid().ToString();

#pragma warning disable CS8603 // Possible null reference return.
        public IClientContext ClientContext => null;
        public string FunctionName => "TestFunction";
        public string FunctionVersion => "1";
        public ICognitoIdentity Identity => null;
#pragma warning restore CS8603 // Possible null reference return.
        public string InvokedFunctionArn => "arn:aws:lambda:local";
        public ILambdaLogger Logger => new TestLambdaLogger();
        public string LogGroupName => "test";
        public string LogStreamName => "test";
        public int MemoryLimitInMB => 128;
        public TimeSpan RemainingTime => TimeSpan.FromMinutes(1);
    }
}