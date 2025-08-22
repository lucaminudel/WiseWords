#!/bin/bash

# Configuration
PROFILE="deploy-to-production-profile"

echo "🔍 WiseWords AWS Configuration Values"
echo "====================================="
echo ""

# API Gateway
echo "📡 API Gateway:"
API_ID=$(aws apigateway get-rest-apis --profile $PROFILE --query 'items[?name==`wisewords`].id' --output text)
if [ -n "$API_ID" ]; then
    echo "  API ID: $API_ID"
    echo "  API URL: https://$API_ID.execute-api.eu-west-2.amazonaws.com/Prod"
else
    echo "  ❌ No API Gateway found"
fi
echo ""

# CloudFront
echo "☁️ CloudFront:"
CF_DOMAIN=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].DomainName' --output text)
CF_ID=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text)
if [ -n "$CF_DOMAIN" ]; then
    echo "  Distribution ID: $CF_ID"
    echo "  Domain: $CF_DOMAIN"
    echo "  Frontend URL: https://$CF_DOMAIN"
else
    echo "  ❌ No CloudFront distribution found"
fi
echo ""

# Cognito
echo "🔐 Cognito:"
aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text | while read POOL_ID; do
    echo "  User Pool ID: $POOL_ID"
done

aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text | while read CLIENT_ID; do
    echo "  Client ID: $CLIENT_ID"
done

aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text | while read IDENTITY_ID; do
    echo "  Identity Pool ID: $IDENTITY_ID"
done

echo "  Region: eu-west-2"
echo "  Domain: wisewords.auth.eu-west-2.amazoncognito.com"
echo ""

# S3
echo "🪣 S3:"
echo "  Bucket: wisewords-frontend"
echo "  Region: eu-west-2"
echo ""

echo "📋 Current env.aws_prod.json should contain:"
echo "{"
echo "  \"ApiBaseUrl\": \"https://$API_ID.execute-api.eu-west-2.amazonaws.com/Prod\","
echo "  \"AWS\": { \"Region\": \"eu-west-2\" },"
echo "  \"Cognito\": {"
aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text | while read POOL_ID; do
    echo "    \"UserPoolId\": \"$POOL_ID\","
done
aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text | while read CLIENT_ID; do
    echo "    \"ClientId\": \"$CLIENT_ID\","
done
aws cloudformation describe-stacks --stack-name wisewords --profile $PROFILE --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text | while read IDENTITY_ID; do
    echo "    \"IdentityPoolId\": \"$IDENTITY_ID\","
done
echo "    \"Region\": \"eu-west-2\","
echo "    \"Domain\": \"wisewords.auth.eu-west-2.amazoncognito.com\""
echo "  }"
echo "}"