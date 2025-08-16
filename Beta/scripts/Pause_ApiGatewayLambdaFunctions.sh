#!/bin/bash

echo "Pausing WiseWords API Gateway and Lambda..."

# Get the Lambda function name
FUNCTION_NAME=$(aws lambda list-functions --region eu-west-2 --profile deploy-to-production-profile --query 'Functions[?contains(FunctionName, `wisewords`)].FunctionName' --output text)

if [ -z "$FUNCTION_NAME" ]; then
    echo "Error: Could not find WiseWords Lambda function"
    exit 1
fi

echo "Found Lambda function: $FUNCTION_NAME"

# Set Lambda concurrency to 0 (prevents execution)
echo "Setting Lambda concurrency to 0..."
aws lambda put-function-concurrency --function-name $FUNCTION_NAME --reserved-concurrent-executions 0 --region eu-west-2 --profile deploy-to-production-profile

# Set API Gateway throttling to 0 requests per second
echo "Setting API Gateway throttling to 0..."
aws apigateway update-stage --rest-api-id dr2qc787yd --stage-name Prod --patch-operations op=replace,path=/*/*/throttling/rateLimit,value=0 --region eu-west-2 --profile deploy-to-production-profile

echo "✅ WiseWords API is now paused"
echo "   - Lambda function cannot execute (concurrency = 0)"
echo "   - API Gateway blocks all requests (rate limit = 0)"
echo ""
echo "To resume, run: ./Resume_ApiGatewayLambdaFunctions.sh"