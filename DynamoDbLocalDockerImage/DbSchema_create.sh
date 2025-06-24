#!/bin/bash

TABLE_NAME="WiseWordsTable"
TABLE_SCHEMA_FILE="DbSchema.json"

source "$(dirname "$0")/my-dinamodb-local_env_variables.sh"

echo "Checking if table $TABLE_NAME already exists in region $REGION..."

# Check if table exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" --endpoint-url $END_POINT > /dev/null 2>&1; then
    echo "Table '$TABLE_NAME' already exists. Skipping creation."
else
    echo "Table '$TABLE_NAME' does not exist. Creating..."
    # Use --cli-input-json to pass the table schema from the JSON file
    aws dynamodb create-table --cli-input-json "file://$TABLE_SCHEMA_FILE" --endpoint-url $END_POINT --no-cli-pager

    # Check for successful creation command
    if [ $? -eq 0 ]; then
        echo "Table creation command sent. Waiting for table '$TABLE_NAME' to become active..."
        aws dynamodb wait table-exists --table-name "$TABLE_NAME" --endpoint-url $END_POINT
        echo "Table '$TABLE_NAME' is now ACTIVE."
    else
        echo "Error creating table '$TABLE_NAME'."
        exit 1
    fi
fi

echo "Deployment complete for $TABLE_NAME."