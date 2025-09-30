#!/bin/bash
clear
echo -e "\033[0;32m--- Lambda update triggered at $(date) ---\033[0m"
PHYSICAL_FN=$(aws cloudformation describe-stack-resources --stack-name wisewords --logical-resource-id ConversationsAndPostsAPI --query "StackResources[0].PhysicalResourceId" --output text --region eu-west-2 --profile deploy-to-production-profile)
echo "Deploying to $PHYSICAL_FN"
aws lambda update-function-code --function-name "$PHYSICAL_FN" --zip-file fileb://publish.zip --publish --region eu-west-2 --profile deploy-to-production-profile
echo -e "\nLambda update process finished. Ready to watch for next change."
