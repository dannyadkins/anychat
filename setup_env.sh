#!/bin/bash

# Parallel arrays for .env file locations and their corresponding variables
env_files=(
  "./apps/api/.env"
)
env_vars=(
  "TF_VAR_ami_id TF_VAR_subnet_id TF_VAR_vpc_id"
)

echo "Setting up environment variables..."

# Iterate through the .env files and variables
for i in "${!env_files[@]}"; do
  env_file="${env_files[$i]}"

  # Ensure the directory exists
  if [ ! -d "$(dirname "$env_file")" ]; then
    echo "Directory $(dirname "$env_file") does not exist, creating..."
    mkdir -p "$(dirname "$env_file")"
  fi

  # Ensure the .env file exists
  if [ ! -f "$env_file" ]; then
    echo "$env_file does not exist, creating..."
    touch "$env_file"
  fi

  # Iterate through the variables for this .env file
  for var in ${env_vars[$i]}; do
    # Check if the variable is already set in the .env file, or if "export variable" is already set
    if ! grep -q "^$var=" "$env_file" && ! grep -q "^export $var=" "$env_file"; then
      # Prompt the user for the value
      read -rp "Enter value for $var: " value

      # Check if the variable needs to be exported
      case "$var" in
        TF_VAR_ami_id | TF_VAR_subnet_id | TF_VAR_vpc_id)
          echo "export $var=$value" >> "$env_file"
          ;;
        *)
          echo "$var=$value" >> "$env_file"
          ;;
      esac
    fi
  done
done