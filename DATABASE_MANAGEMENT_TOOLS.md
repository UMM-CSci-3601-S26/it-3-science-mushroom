# Database Management Tools

These tools help manage MongoDB collections inside the Docker Mongo volume.

They are meant for targeted collection work, such as dropping one collection, reseeding one collection, or seeding one collection only when it is missing.

## Requirements

To run these scripts, you need:

- Docker running
- `docker-compose` available in your terminal
- Bash, Git Bash, WSL, or Linux
- The Docker Mongo service started
- The target database to already exist
- For seed scripts, the seed JSON file must exist in `database/seed`

Start the Mongo service from the repo root:

```bash
docker-compose up -d mongo
```

## Where To Run Commands

The scripts are written to find `docker-compose.yml` and `database/seed` relative to the script file. That means you can run them from either the repo root or from inside the `database` folder.

From the repo root:

```bash
bash ./database/targetcollectionreseed.sh prod inventory inventory
```

From inside `database`:

```bash
bash ./targetcollectionreseed.sh prod inventory inventory
```

Using `bash` does not require execute permission. If you want to run scripts directly with `./script-name.sh`, first run:

```bash
chmod +x database/*.sh
```

## Safety

Read the script output before confirming. These scripts print the database, collection, seed file, and document counts where useful.

For actions that change data, the script asks you to type the exact target:

```text
prod.inventory
```

If the confirmation does not match, the script cancels before changing data.

## Parameters

`<database_name>`
The MongoDB database to use.

`<collection_name>`
The MongoDB collection to check, drop, seed, or reseed.

`<seed_file>`
The seed file name from `database/seed`. You can type it with or without `.json`.

Example:

```bash
inventory
```

This points to:

```text
database/seed/inventory.json
```

## Collection Tools

### `targetcollectionreseed.sh`

Drops an existing collection and imports seed data back into a collection with the same name.

This is destructive because it drops the collection first.

Required parameters:

```text
<database_name> <collection_name> <seed_file>
```

Run from the repo root:

```bash
bash ./database/targetcollectionreseed.sh prod inventory inventory
```

Run from inside `database`:

```bash
bash ./targetcollectionreseed.sh prod inventory inventory
```

What it checks:

- The seed file exists
- The database exists
- The collection exists
- The exact `database.collection` target is confirmed before dropping

### `targetcollectiondrop.sh`

Drops an existing collection only. It does not reseed or import data afterward.

This is destructive.

Required parameters:

```text
<database_name> <collection_name>
```

Run from the repo root:

```bash
bash ./database/targetcollectiondrop.sh prod inventory
```

Run from inside `database`:

```bash
bash ./targetcollectiondrop.sh prod inventory
```

What it checks:

- The database exists
- The collection exists
- The current document count before dropping
- The exact `database.collection` target is confirmed before dropping
- The collection is gone after dropping

### `targetcollectionseedifmissing.sh`

Imports seed data only if the target collection does not already exist.

This does not modify existing collections. If the collection already exists, the script prints the current document count and skips import.

Required parameters:

```text
<database_name> <collection_name> <seed_file>
```

Run from the repo root:

```bash
bash ./database/targetcollectionseedifmissing.sh prod inventory inventory
```

Run from inside `database`:

```bash
bash ./targetcollectionseedifmissing.sh prod inventory inventory
```

What it checks:

- The seed file exists
- The database exists
- Whether the target collection already exists
- The exact `database.collection` target is confirmed before importing
- The document count after importing
