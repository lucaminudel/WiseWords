# The production AWS cloud architecture of this application can be inferred from 
- the marmaid architectural diagram available [here](Readme.md)
- the SAM template_aws_prod.yalm file available [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/template_aws_prod.yaml)
- the SAM config file available [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/samconfig.toml)
- these deploy scripts [here](./scripts/)

# Configuration and support for both the local development environment and the production AWS environment can be inferred from 
- the config files with runtime config into template_local_dev.yalm and template_aws_prod.yalm configuration info [here](./config/)
- the backend code loading this envirinment info [here](./WiseWords.ConversationsAndPosts.DataStore/Configuration/Loader.cs)
- these WiseWords.FrontEnd file
  - the code encapsulating and centralising all the access and logic for loading the environment configuration info [here](./WiseWords.FrontEnd/src/config/environment.ts)
  - the code used during the preparation of the production bundle with static configuration info [here](./WiseWords.FrontEnd/scripts/copy-config.js)
  - the unit test configuration [here](./WiseWords/Beta/WiseWords.FrontEnd/vite.config.ts)
  - the end to end test configuration [here](./WiseWords/Beta/WiseWords.FrontEnd/cypress.config.ts)
The local development environment (local_dev) runs with DynamoDB and SAM in local Docker images and without AWS Cognito authentication.



# Info on AWS Cognito authentication and authorisation used in the FrontEnd can be inferred from 
- In the SAM configuration
  - the SAM template_aws_prod.yalm file available [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/template_aws_prod.yaml)
  - the SAM config file available [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/samconfig.toml)
- in the FrontEnd code
   - the auth callback page [here](./WiseWords.FrontEnd/src/components/CallbackPage.tsx)
   - the auth flow state [here](./WiseWords.FrontEnd/src/services/authNavigationFlowSessionState.ts)
   - the authentication context info [here](./WiseWords.FrontEnd/src/contexts)
   - the auth header [here](./WiseWords.FrontEnd/src/components/AuthHeader.tsx)
   - the pages triggering the loing are in [here](./WiseWords.FrontEnd/src/components/)
- the Author's name verification 
      - it the Lambdas [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas/)
      - in the API Gateway [here](./WiseWords.ConversationsAndPosts.AWS.Lambdas.ApiGateway/)
