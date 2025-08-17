#!/bin/bash

echo "Resuming WiseWords API Gateway and Lambda..."

# Get the Lambda function name
FUNCTION_NAME=$(aws lambda list-functions --region eu-west-2 --profile deploy-to-production-profile --query 'Functions[?contains(FunctionName, `wisewords`)].FunctionName' --output text)

if [ -z "$FUNCTION_NAME" ]; then
    echo "Error: Could not find WiseWords Lambda function"
    exit 1
fi

echo "Found Lambda function: $FUNCTION_NAME"

# Remove Lambda concurrency limit (allows normal execution)
echo "Removing Lambda concurrency limit..."
aws lambda delete-function-concurrency --function-name $FUNCTION_NAME --region eu-west-2 --profile deploy-to-production-profile

# Reset API Gateway throttling to default (high value)
echo "Resetting API Gateway throttling to default..."
aws apigateway update-stage --rest-api-id dr2qc787yd --stage-name Prod --patch-operations op=replace,path=/*/*/throttling/rateLimit,value=10000 --region eu-west-2 --profile deploy-to-production-profile

echo "✅ WiseWords API is now resumed"
echo "   - Lambda function can execute normally"
echo "   - API Gateway accepts all requests"
echo ""
echo "API URL: https://dr2qc787yd.execute-api.eu-west-2.amazonaws.com/Prod"