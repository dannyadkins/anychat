#!/bin/bash

# Get the directory where the script itself is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load NUM_SHARDS from env
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "Warning: $ENV_FILE not found."
fi

# Iterate from 0 to NUM_SHARDS-1
for (( i=0; i<$NUM_SHARDS; i++ )); do
  # Construct the variable name for the current shard's database URL
  VAR_NAME="DATABASE_URL_$i"

  
  # Use indirect expansion to get the value of the variable named by VAR_NAME
  DATABASE_URL=${!VAR_NAME}
  
  echo "Pushing database for shard $i... to $DATABASE_URL"

  
  if [ -z "$DATABASE_URL" ]; then
    echo "Warning: $VAR_NAME not found."
  else
    # Run Prisma db push with the current shard's database URL
    DATABASE_URL="$DATABASE_URL" npx prisma db push
  fi
done
