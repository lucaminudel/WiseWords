using Amazon.Lambda.Core;

namespace SpikeB.WiseWordsAWSLambdaFacade.Tests
{
    public class TestLambdaLogger : ILambdaLogger
    {
        public void Log(string message) { }
        public void LogLine(string message) { }
    }
}