To run this first what is needed is 
- AWS SAM CLI
- Docker

Then for AWS SAM and the Docker image to support the build of multi-project .NET solutions (otherwise not supported by sam build), the commands needed are:
- dotnet publish SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade/SpikeC.WiseWordsAWSApiGatewayAndLambdaFacade.csproj -c Release -o ./publish
- sam local start-api --template template.yaml 

where template.yaml specifies that the container will use the bins built locally and stored into the publish folder.


From another terminal you can use this command to call the API via http with a valid call that succeed:
- curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d '{"NewGuid":"123e4567-e89b-12d3-a456-426614174000", "ConvoType":1, "Title":"Hello Title", "MessageBody":"Message body Hi", "Author":"MikeG", "UtcCreationTime":"2024-07-03T12:00:00Z"}'

To try with a call that fails, edit ConvoType value into a string value "1" or into an invalid value Q1 or try a call to a GET of the posts of a conversation with an invalid url format
- curl -X GET http://localhost:3000/conversations//posts


Finally the container used is so minimal that it cannot tar the visual studio code debugger that the required installation of does not work currently:

- curl -SL https://aka.ms/getvsdbgsh | bash /dev/stdin -v latest -l /vsdbg

