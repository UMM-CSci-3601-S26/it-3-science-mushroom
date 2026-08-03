#!/usr/bin/env bash

# Find paths relative to this script so it can be run from the repo root.
script_src="$(dirname "${BASH_SOURCE[0]}")"
compose_file="$script_src/../docker-compose.yml"

# Read the database, collection, and seed name from command arguments.
database_name="$1"
collection_name="$2"
seed_name="${3%.json}"
seed_file="$script_src/seed/$seed_name.json"

# validateTarget checks that the database and target collection exist before reseeding.
validateTarget() {
  local database_name="$1"
  local collection_name="$2"
  local -a databases

  # Get the real database names from the Docker Mongo service.
  mapfile -t databases < <(docker-compose -f "$compose_file" exec -T mongo mongosh --quiet --eval 'db.getMongo().getDBNames().forEach(database => print(database));')

  # Only check collections after the requested database is found.
  for i in "${databases[@]}"; do
    if [ "$database_name" = "$i" ]; then
      local -a collections
      mapfile -t collections < <(docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval 'db.getCollectionNames().forEach(collection => print(collection));')

      # Confirm the target collection exists in that database.
      for collection in "${collections[@]}"; do
        if [ "$collection_name" = "$collection" ]; then
          echo "Target collection '$database_name.$collection_name' found"
          return 0
        fi
      done

      echo "Collection name '$collection_name' could not be found in '$database_name'"
      return 1
    fi
  done

  echo "Database name '$database_name' could not be found in docker volume"
  return 1
}

# Check that the selected seed file exists on the host before dropping data.
validateExistenceOfFilesPath() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo "File does not exist: $file_path"
    return 1
  else
    echo "Seed data found at path '$file_path'"
    return 0
  fi
}

# Drop only the requested collection, not the whole database.
dropTargetCollection() {
  local database_name="$1"
  local collection_name="$2"

  echo "Dropping collection '$database_name.$collection_name'"
  docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval "db.getCollection('$collection_name').drop()"
}

# Stream the host seed file into mongoimport inside Docker.
importSeedFile() {
  local database_name="$1"
  local collection_name="$2"
  local seed_file="$3"

  echo "Importing '$seed_file' into '$database_name.$collection_name'"
  docker-compose -f "$compose_file" exec -T mongo mongoimport --db="$database_name" --collection="$collection_name" --jsonArray < "$seed_file"
}

# Count documents so the script can show before/after results.
documentCount() {
  local database_name="$1"
  local collection_name="$2"

  docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval "db.getCollection('$collection_name').countDocuments({})"
}

# Ask the user to confirm the exact target before changing data.
confirmTargetAction() {
  local message="$1"
  local expected_target="$2"
  local confirmation

  echo "$message"
  read -r -p "Type '$expected_target' to continue: " confirmation

  if [ "$confirmation" != "$expected_target" ]; then
    echo "Confirmation did not match. Canceling."
    return 1
  fi

  return 0
}

# Stop early if required arguments are missing.
if [ -z "$database_name" ] || [ -z "$collection_name" ] || [ -z "$seed_name" ]; then
  echo "Usage: $0 <database-name> <collection-name> <seed-file-name>"
  exit 1
fi

echo "Your database name is: $database_name"
echo "Your collection name is: $collection_name"
echo "Your seed file is: $seed_file"

# Validate everything before doing the destructive drop.
validateExistenceOfFilesPath "$seed_file" || exit 1
validateTarget "$database_name" "$collection_name" || exit 1

# Show current size, reseed the collection, then show the new size.
starting_doc_count="$(documentCount "$database_name" "$collection_name")"
echo "Collection '$database_name.$collection_name' currently has $starting_doc_count documents"

confirmTargetAction "This will drop and reseed '$database_name.$collection_name' from '$seed_file'." "$database_name.$collection_name" || exit 1

dropTargetCollection "$database_name" "$collection_name" || exit 1
importSeedFile "$database_name" "$collection_name" "$seed_file" || exit 1

ending_doc_count="$(documentCount "$database_name" "$collection_name")"
echo "Collection '$database_name.$collection_name' now has $ending_doc_count documents"
