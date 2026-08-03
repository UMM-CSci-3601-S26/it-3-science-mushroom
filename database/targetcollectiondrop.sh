#!/usr/bin/env bash

# Find paths relative to this script so it can be run from the repo root.
script_src="$(dirname "${BASH_SOURCE[0]}")"
compose_file="$script_src/../docker-compose.yml"

# Read the database and collection from command arguments.
database_name="$1"
collection_name="$2"

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

# Return success only when the requested collection exists.
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

# Check that the collection exists before dropping it.
validateTargetCollection() {
  local database_name="$1"
  local collection_name="$2"

  if collectionExists "$database_name" "$collection_name"; then
    echo "Target collection '$database_name.$collection_name' found"
    return 0
  fi

  echo "Collection name '$collection_name' could not be found in '$database_name'"
  return 1
}

# Count documents so the script can show what will be dropped.
documentCount() {
  local database_name="$1"
  local collection_name="$2"

  docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval "db.getCollection('$collection_name').countDocuments({})"
}

# Drop only the requested collection, not the whole database.
dropTargetCollection() {
  local database_name="$1"
  local collection_name="$2"

  echo "Dropping collection '$database_name.$collection_name'"
  docker-compose -f "$compose_file" exec -T mongo mongosh "$database_name" --quiet --eval "db.getCollection('$collection_name').drop()"
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
if [ -z "$database_name" ] || [ -z "$collection_name" ]; then
  echo "Usage: $0 <database-name> <collection-name>"
  exit 1
fi

echo "Your database name is: $database_name"
echo "Your collection name is: $collection_name"

# Validate the target before doing the destructive drop.
validateDatabase "$database_name" || exit 1
validateTargetCollection "$database_name" "$collection_name" || exit 1

doc_count="$(documentCount "$database_name" "$collection_name")"
echo "Collection '$database_name.$collection_name' currently has $doc_count documents"

confirmTargetAction "This will drop '$database_name.$collection_name' and will not reseed it." "$database_name.$collection_name" || exit 1

if ! drop_result="$(dropTargetCollection "$database_name" "$collection_name")"; then
  echo "$drop_result"
  echo "Failed to drop collection '$database_name.$collection_name'"
  exit 1
fi
echo "$drop_result"

if collectionExists "$database_name" "$collection_name"; then
  echo "Collection '$database_name.$collection_name' still exists after drop"
  exit 1
fi

echo "Collection '$database_name.$collection_name' was dropped"
