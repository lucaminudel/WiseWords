#!/bin/bash

# ==============================
# Dual-use DynamoDB table deploy
# ==============================
# Usage:
#   TARGET=local ./DbSchema_create.sh   # deploy to local DynamoDB
#   TARGET=aws   ./DbSchema_create.sh   # deploy to AWS DynamoDB
# ==============================

TABLE_NAME="WiseWordsTable"
TABLE_SCHEMA_FILE="../templates/DbSchema.json"
TARGET=${TARGET:-local}   # Default to local if not specified
REGION="eu-west-2"        # Change if needed

if [ "$TARGET" = "local" ]; then
    echo "=== Deploying to LOCAL DynamoDB ==="
    # Load your local env variables (endpoint + dummy keys)
    source "$(dirname "$0")/my-dinamodb-local_env_variables.sh"
    AWS_ARGS="--endpoint-url $END_POINT"
else
    echo "=== Deploying to AWS DynamoDB in region $REGION ==="
    AWS_ARGS="--region $REGION"
fi

echo "Checking if table '$TABLE_NAME' already exists..."

if aws dynamodb describe-table --table-name "$TABLE_NAME" $AWS_ARGS > /dev/null 2>&1; then
    echo "Table '$TABLE_NAME' already exists. Skipping creation."
else
    echo "Table '$TABLE_NAME' does not exist. Creating..."
    aws dynamodb create-table --cli-input-json "file://$TABLE_SCHEMA_FILE" $AWS_ARGS --no-cli-pager

    if [ $? -eq 0 ]; then
        echo "Table creation command sent. Waiting for table '$TABLE_NAME' to become active..."
        aws dynamodb wait table-exists --table-name "$TABLE_NAME" $AWS_ARGS
        echo "Table '$TABLE_NAME' is now ACTIVE."
    else
        echo "Error creating table '$TABLE_NAME'."
        exit 1
    fi
fi

echo "Deployment complete for '$TABLE_NAME'."
