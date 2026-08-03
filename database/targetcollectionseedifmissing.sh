#!/usr/bin/env bash

# Find paths relative to this script so it can be run from the repo root.
script_src="$(dirname "${BASH_SOURCE[0]}")"
compose_file="$script_src/../docker-compose.yml"

# Read the database, collection, and seed name from command arguments.
database_name="$1"
collection_name="$2"
seed_name="${3%.json}"
seed_file="$script_src/seed/$seed_name.json"

# Check that the selected seed file exists on the host before importing.
validateSeedFile() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo "File does not exist: $file_path"
    return 1
  fi

  echo "Seed data found at path '$file_path'"
  return 0
}

# Check that the requested database exists in the Docker Mongo service.
validateDatabase() {
  local database_name="$1"
  local -a databases

  mapfile -t databases < <(docker-compose -f "$compose_file" exec -T mongo mongosh --quiet --eval 'db.getMongo().getDBNames().forEach(database => print(database));')

  for database in "${databases[@]}"; do
    if [ "$database_name" = "$database" ]; then
      echo "Database '$database_name' found"
      return 0
    fi
  done

  echo "Database name '$database_name' could not be found in docker volume"
  return 1
}

# Return success only when the requested collection already exists.
collectionExists() {
  local database_name="$1"
  local collection_name="$2"
  local -a collections

  mapfile -t collections < <(docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval 'db.getCollectionNames().forEach(collection => print(collection));')

  for collection in "${collections[@]}"; do
    if [ "$collection_name" = "$collection" ]; then
      return 0
    fi
  done

  return 1
}

# Stream the host seed file into mongoimport inside Docker.
importSeedFile() {
  local database_name="$1"
  local collection_name="$2"
  local seed_file="$3"

  echo "Importing '$seed_file' into '$database_name.$collection_name'"
  docker-compose -f "$compose_file" exec -T mongo mongoimport --db="$database_name" --collection="$collection_name" --jsonArray < "$seed_file"
}

# Count documents so the script can show the import result.
documentCount() {
  local database_name="$1"
  local collection_name="$2"

  docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval "db.getCollection('$collection_name').countDocuments({})"
}

# Stop early if required arguments are missing.
if [ -z "$database_name" ] || [ -z "$collection_name" ] || [ -z "$seed_name" ]; then
  echo "Usage: $0 <database-name> <collection-name> <seed-file-name>"
  exit 1
fi

echo "Your database name is: $database_name"
echo "Your collection name is: $collection_name"
echo "Your seed file is: $seed_file"

validateSeedFile "$seed_file" || exit 1
validateDatabase "$database_name" || exit 1

if collectionExists "$database_name" "$collection_name"; then
  doc_count="$(documentCount "$database_name" "$collection_name")"
  echo "Collection '$database_name.$collection_name' already exists with $doc_count documents; skipping import"
  exit 0
fi

echo "Collection '$database_name.$collection_name' does not exist; seeding it now"
importSeedFile "$database_name" "$collection_name" "$seed_file" || exit 1

ending_doc_count="$(documentCount "$database_name" "$collection_name")"
echo "Collection '$database_name.$collection_name' now has $ending_doc_count documents"
