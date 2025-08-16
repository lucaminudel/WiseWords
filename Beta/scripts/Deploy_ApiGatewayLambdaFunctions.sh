cd ../WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway

# Build the Lambda and API Gateway code for deployment into the ./publish folder  
dotnet publish WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway.csproj  -c Release -o ./publish -r linux-x64

cd publish && zip -r ../publish.zip . && cd ..
rm -rf publish

# Clean up any failed deployments
aws cloudformation delete-stack --stack-name wisewords --region eu-west-2 --profile deploy-to-production-profile 2>/dev/null || true
aws cloudformation wait stack-delete-complete --stack-name wisewords --region eu-west-2 --profile deploy-to-production-profile 2>/dev/null || true

# Deploy 
# add -- guided for the 1st deploy
# all command parameters will are in samconfig.toml (or will be saved there at the 1st execution)
sam deploy --template-file template_aws_prod.yaml
