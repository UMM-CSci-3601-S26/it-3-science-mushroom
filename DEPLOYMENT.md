# DigitalOcean Deployment Instructions <!-- omit in toc -->

- [Summary](#summary)
  - [Some terminology](#some-terminology)
- [Environment Variables](#environment-variables)
  - [Required Values](#required-values)
- [Step 1: Creating an account](#step-1-creating-an-account)
- [Step 2: Creating a droplet](#step-2-creating-a-droplet)
- [Step 3: Setting up your droplet and running your project](#step-3-setting-up-your-droplet-and-running-your-project)
- [Verifying deployment](#verifying-deployment)
- [Common tasks](#common-tasks)
  - [Rerunning setupdroplet.sh](#rerunning-setupdropletsh)
  - [Resetting the database](#resetting-the-database)
  - [Updating the server or client code](#updating-the-server-or-client-code)
- [Additional Docker Compose commands](#additional-docker-compose-commands)
- [Using a custom domain](#using-a-custom-domain)
- [Troubleshooting](#troubleshooting)
  - [Client debugging](#client-debugging)
  - [Server debugging](#server-debugging)

## Summary

This document is, essentially, a short guide to setting up a "droplet" on [DigitalOcean](https://www.digitalocean.com)
to be used as a tool for deploying simple web applications. This is by no means a
comprehensive guide, and you are encouraged to reach out to classmates, faculty, and
TAs (through Slack, for example) with questions.

Most of this will happen in a terminal window, which is yet another reason to take
some time to learn how to use the Unix shell.

### Some terminology

You're going to see the word "droplet" used a lot here. Digital ocean is in the
business of hosting Virtual Private Servers (VPS), which they have decided to call
"droplets." The term isn't terribly important, and for the most part just refers
specifically to the VPSs hosted by DigitalOcean and all the features which that
entails.

We will be using a tool called Docker to help with the deployment process.
Docker is a tool for creating and running _software containers_.
Containers allow a developer to package up an application with all of
the parts it needs,
such as libraries and other dependencies, and deploy it as a single unit.
We will use Docker to separate our app into three containers:
One for the Java server, one for hosting the client files, and one for the database.

- A Docker **image** is the blueprint for a **container**. It contains the filesystem and instructions for what to execute.
  - Each part of the project, the client and server, have files called `Dockerfile` that instructs Docker how to create the image for each of them.
- A Docker **container** is an instance of an **image**.
- **Compose** is a tool for running multiple containers together and setting up storage and communication between them. We will be using the command `docker-compose` for much of the management of our containers.
  - The project has a [`docker-compose.yml`](docker-compose.yml) file that instructs Docker Compose on how to run our server, client, and database containers together.

## Environment Variables

Deployment uses a `.env` file in the root of the repository. Docker Compose reads this file when starting the containers.

### Required Values

| Variable | Required | Purpose |
|---|---|---|
| `APP_HOST` | Yes | The hostname Caddy uses to serve the site, such as `your-domain.nip.io`. |
| `JWT_SECRET` | Yes | A private random secret used by the server to sign and authenticate tokens. |
| `APP_CADDY_GLOBAL_OPTIONS` | No | Optional Caddy global config used for setting an email address for HTTPS certificate notifications. |

The `setupdroplet.sh` script creates `.env` automatically. It sets `APP_HOST`, generates `JWT_SECRET`, and optionally writes `APP_CADDY_GLOBAL_OPTIONS` if an email is entered.

> **Important:** Do not commit `.env`. It contains `JWT_SECRET`, which must stay private.

## Step 1: Creating an account

- Go to [Digital Ocean](https://www.digitalocean.com).
- You _can_ create an account without adding billing information.
- You _cannot_ create any droplets without "activating" your account (by adding billing info).
- You _do_ get $200 of free credit for Digital Ocean through [the Github StudentPack](https://education.github.com/pack). Be sure to redeem it. That should easily get
  you through the semester with room to spare.

## Step 2: Creating a droplet

- Go to
  [this link](https://cloud.digitalocean.com/droplets/new?image=docker-20-04&app=docker&size=s-1vcpu-1gb&options=install_agent).
  It should bring you to the Create Droplets page with the Docker
  marketplace image selected and the $6/month basic plan selected.
  If those are not selected, please select them.
  - You may find that the next size of ($12/month) provides better performance,
    especially as your project grows more complex.
- Stick with the default datacenter / region (probably one of the U.S. options).
- Scroll down and choose "Password" under Authentication. Enter a password here,
  this will be the password for the `root` user.
  - This should be a good, secure password since it gives access to everything on
    your droplet and anyone can attempt to `ssh` into it. You may wish to use a random
    password generator for this.
  - You can change this password later with the `passwd` command.
- You don't need to add block storage or backups.
- Finally, only make one droplet and choose a name for it.
- It will take a couple seconds to make the droplet.
- You will then be able to see it on your
  [Droplets](https://cloud.digitalocean.com/droplets) page and get the IP for it.

## Step 3: Setting up your droplet and running your project

- SSH to your droplet by running ``ssh root@[droplet ip here]`` (using the IP of your droplet) and enter the password you set.
- When you first log in it'll tell you if there are any updates available. Don't feel
  like you have to do these updates; they should start you off with a pretty up-to-date
  system. If if you want to upgrade your system, you can run `apt update` and then
  `apt upgrade` to apply the updates. There could be some odd questions along the
  way, though, so be prepared to have to do some homework to figure out what
  reasonable responses might be.
- Install `docker-compose` with the command `apt install docker-compose`.
- `git clone` your repository
- `cd` into the newly created directory
- If needed, run `chmod +x setupdroplet.sh` to make the setup script executable.
- run `./setupdroplet.sh` to go through the initial setup steps
  - It will ask for your email address, which will be used for any relevant alerts about your HTTPS certificate (you probably won't get any emails from them). Entering your email signifies agreement to the [Let's Encrypt Subscriber Agreement](https://letsencrypt.org/documents/2017.11.15-LE-SA-v1.2.pdf) and the [ZeroSSL Terms of Service](https://zerossl.com/terms/) (either one of those providers may be used to setup your certificate).
  - It will generate `JWT_SECRET` automatically and save it in the `.env` file Docker Compose uses.
  - Rerunning `./setupdroplet.sh` will create a new `.env` with a new `JWT_SECRET`. This will invalidate existing login sessions.
  - We are using a service called [nip.io](https://nip.io/) to give us the valid domains we need for HTTPS. The script will tell you the `nip.io` address your app will be hosted on. Copy this down for later.
- To build and start your server, run `docker-compose up -d`
  - The `-d` means detached and you can then run `docker-compose logs` to see the output at any time.
  - To stop the containers, run `docker-compose stop`
  - This is going to take a while. You're downloading 3/8ths of the Internet, and
    building everything on a fairly lightweight machine. You shouldn't have to do
    this all that often, but using a higher tier (i.e., more expensive) droplet
    will speed the process up.

## Verifying deployment

After starting the containers, check that they are running:

```bash
docker-compose ps
```

Check the logs if something failed:

```bash
docker-compose logs
```

Check only the server logs:

```bash
docker-compose logs server
```

The deployed app exposes a health endpoint at the host stored in `.env`:

```bash
curl "https://$(grep '^APP_HOST=' .env | cut -d '=' -f2-)/api/health"
```

This should return `ok`. The Java server's port `4567` is only available inside Docker's private network, so `curl http://localhost:4567/api/health` from the droplet host will not work unless you temporarily publish that port in `docker-compose.yml`.

You can also confirm that `.env` contains the required keys:

```bash
grep -E '^(APP_HOST|JWT_SECRET)=' .env
```

Do not print or share the full `JWT_SECRET` value.

## Common tasks

Do all of these from within the base directory of the repo.

### Rerunning setupdroplet.sh

`setupdroplet.sh` creates a new `.env` file. If you rerun it, it will generate a new `JWT_SECRET`.

Changing `JWT_SECRET` does not delete application data, but it does invalidate existing login sessions. Users may need to log in again.

### Resetting the database

To clear the current database and have it seeded again:

> **Warning:** `docker-compose down -v` deletes the MongoDB volume. This removes production data and causes the database to be reseeded from `database/seed` on the next startup.

- `docker-compose down -v` to stop and remove containers and volumes.
- `docker-compose up -d` to build and start the containers again.

> **Important:** The production database is seeded from `database/seed` the first time the Mongo volume is created. Review the seeded users and remove or change any default accounts before using the deployment with real data.

### Updating the server or client code

If you have made changes and wish to update what is running on the server:

- `docker-compose down` to stop and remove containers (if you want to also reset the database, use `docker-compose down -v`).
- `git pull` to update the code.
- `docker-compose up --build -d` to rebuild anything that has changed and start the containers.

## Additional Docker Compose commands

- `docker-compose logs [service]` will give you the logs of the specific service
  - For example, `docker-compose logs server` will give just the logs from the Java server.
  - `docker-compose logs --follow` will open the logs and follow their output so you can see new messages as they come. Exiting out of `logs --follow` does not stop the server containers.
- `docker-compose ps` lists the running containers
- `docker-compose stop` just stops all the containers, it does not remove anything.
  - Use `docker-compose start` to start those same stopped containers again.
- `docker-compose down` stops the containers and removes them.
  - After `docker-compose down`, use `docker-compose up -d` to create and start the containers again.
  - `docker-compose down --rmi all` removes all the images. It will then require rebuilding the images next time.
  - More [Docker options](https://docs.docker.com/compose/reference/down/)
- `docker-compose build` will build the images if things have changed in them

There are many more commands and options for `docker-compose`. They are all documented on the [Docker Compose CLI reference](https://docs.docker.com/compose/reference/).

## Using a custom domain

If you have purchased a domain for your project and would like to use it, set its
DNS `A record` to the IP of your droplet. Stop and remove your containers with `docker-compose down` and then you can use `nano` or similar to edit the `.env` file and change `APP_HOST` to the domain you wish to use. After that use `docker-compose up -d` to start it up again.

## Troubleshooting

- If `docker-compose up -d` fails with `JWT_SECRET environment variable must be set`, rerun `./setupdroplet.sh` or check that `.env` contains `JWT_SECRET`.
- If HTTPS does not work, confirm that `APP_HOST` points to the droplet and that ports `80` and `443` are open.
- If the app starts but API requests fail, check `docker-compose logs server`.
- If the database is empty or has old data, check whether the Mongo volume already exists. Seed data only runs automatically when the Mongo volume is first created.

### Client debugging

The `client` container serves the Angular build through Caddy and reverse proxies `/api` requests to the server container.

Check the client container logs:

```bash
docker-compose logs client
```

Follow client logs live:

```bash
docker-compose logs --follow client
```

Rebuild only the client image after frontend changes:

```bash
docker-compose build client
docker-compose up -d client
```

If the page loads but data does not, open the browser developer tools and check the Network tab. Requests to `/api/...` should return from the same deployed host. If those API requests fail, check `docker-compose logs server`.

If the page does not load at all, check that the `client` container is running with `docker-compose ps`, then check `docker-compose logs client` for Caddy errors.

### Server debugging

The `server` container runs the Java API. It is not exposed directly to the droplet host; Caddy reaches it inside Docker at `server:4567`.

Check the server container logs:

```bash
docker-compose logs server
```

Follow server logs live:

```bash
docker-compose logs --follow server
```

Check whether the server container is running:

```bash
docker-compose ps server
```

Test the server through the deployed Caddy route:

```bash
curl "https://$(grep '^APP_HOST=' .env | cut -d '=' -f2-)/api/health"
```

This should return `ok`. Do not use `curl http://localhost:4567/api/health` from the droplet host unless you have temporarily published the server port in `docker-compose.yml`.

If the server exits immediately, check that `.env` contains `JWT_SECRET`:

```bash
grep '^JWT_SECRET=' .env
```

If the server starts but database-backed requests fail, check whether Mongo is running:

```bash
docker-compose ps mongo
docker-compose logs mongo
```

If code changed on the server, rebuild only the server image:

```bash
docker-compose build server
docker-compose up -d server
```
