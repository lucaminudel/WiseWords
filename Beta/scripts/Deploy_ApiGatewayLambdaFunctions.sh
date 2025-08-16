cd ../WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration

# Build the Lambda and API Gateway code for deployment into the ./publish folder  
dotnet publish WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGatewayProxyIntegration.csproj  -c Release -o ./publish -r linux-x64

cd publish && zip -r ../publish.zip . && cd ..
rm -rf publish

# Add --guided for 1st deploy
sam deploy  --guided --template-file template_aws_prod.yaml --profile deploy-to-production-profile --capabilities CAPABILITY_IAM

sam deploy --template-file template_aws_prod.yaml --stack-name wisewords --capabilities CAPABILITY_IAM
