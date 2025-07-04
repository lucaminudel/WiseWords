# DynamoDB Local Docker Commands

# This will start DynamoDB Local with a persistent data volume, and map port 8000 on your machine to port 8000 in the container
docker create --name my-dynamodb-local-persistent \
  -p 8000:8000 \
  -v /Users/lucaminudel/Code/WiseWords/DynamoDbLocalDockerImage/Volume:/home/dynamodblocal/data \
  amazon/dynamodb-local \
  -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data

