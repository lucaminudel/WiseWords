#!/bin/bash

source "$(dirname "$0")/my-dinamodb-local_env_variables.sh"

aws dynamodb list-tables --endpoint-url $END_POINT 


