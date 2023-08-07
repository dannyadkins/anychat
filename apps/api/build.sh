#!/bin/bash

# Get the directory where the script itself is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Define the path to your Packer template and Terraform directory, relative to the script location
ENV_FILE="$SCRIPT_DIR/.env"
PACKER_TEMPLATE="$SCRIPT_DIR/packer.json"
TERRAFORM_DIR="$SCRIPT_DIR/tf"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "Warning: $ENV_FILE not found."
fi

# Run Packer
packer build "$PACKER_TEMPLATE"

# Navigate to the Terraform directory
cd "$TERRAFORM_DIR"

# Initialize Terraform if it hasn't been initialized
if [ ! -d ".terraform" ]; then
  terraform init --upgrade
fi

# Apply the Terraform configuration
terraform apply
