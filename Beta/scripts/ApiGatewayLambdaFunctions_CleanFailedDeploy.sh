#!/bin/bash

# Clean up any failed deployments
echo "🧹 Cleaning up failed CloudFormation deployments..."

aws cloudformation delete-stack --stack-name wisewords --region eu-west-2 --profile deploy-to-production-profile 2>/dev/null || true
aws cloudformation wait stack-delete-complete --stack-name wisewords --region eu-west-2 --profile deploy-to-production-profile 2>/dev/null || true

echo "✅ Cleanup complete. You can now run ApiGatewayLambdaFunctions_Deploy.sh and update env.aws_prod and template_aws_prod values."