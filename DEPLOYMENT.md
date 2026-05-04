# DigitalOcean Deployment Instructions <!-- omit in toc -->

- [Summary](#summary)
  - [Some terminology](#some-terminology)
- [Environmental Variables](#environmental-variables)
  - [Required Values](#required-values)
- [Step 1: Creating an account](#step-1-creating-an-account)
- [Step 2: Creating a droplet](#step-2-creating-a-droplet)
- [Step 3: Setting up your droplet and running your project](#step-3-setting-up-your-droplet-and-running-your-project)
- [Common tasks](#common-tasks)
  - [Resetting the database](#resetting-the-database)
  - [Updating the server or client code](#updating-the-server-or-client-code)
- [Additional Docker Compose commands](#additional-docker-compose-commands)
- [Using a custom domain](#using-a-custom-domain)

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

## Environmental Variables

Deployment uses a `.env` file in the root of the repository.

### Required Values

| Variable | Required | Purpose |
|---|---|---|
| `APP_HOST` | Yes | The hostname Caddy uses to serve the site, such as `your-domain'.nip.io` |
| `JWT_SECRET` | Yes | A private random secret used by the server to sign and authenticate tokens. |
| `APP_CADDY_GLOBAL_OPTIONS` | No | Optional Caddy global config used for setting an email address for HTTPS certificate notifications. |

The `setupdroplet.sh` script creates `.env` automatically, It sets `APP_HOST`, generates `JWT_SECRET`, and optionally writes `APP_CADDY_GLOBAL_OPTIONS` if an email is entered.

**Important:** Do not commit `.env`. It contains `JWT_SECRET`. which must stay private.

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
- run `./setupdroplet.sh` to go through the initial setup steps
  - It will ask for your email address, which will be used for any relevant alerts about your HTTPS certificate (you probably won't get any emails from them). Entering your email signifies agreement to the [Let's Encrypt Subscriber Agreement](https://letsencrypt.org/documents/2017.11.15-LE-SA-v1.2.pdf) and the [ZeroSSL Terms of Service](https://zerossl.com/terms/) (either one of those providers may be used to setup your certificate).
  - It will generate a JWT_SECRET automatically that is saved in the `.env` file docker uses (do not commit the `.env` file)
  - Rerunning the `./setupdroplet.sh` will create a new `.env` with a new JWT_SECRET. This will invalidate existing login sessions.
  - We are using a service called [nip.io](https://nip.io/) to give us the valid domains we need for HTTPS. The script will tell you the `nip.io` address your app will be hosted on. Copy this down for later.
- To build and start your server, run `docker-compose up -d`
  - The `-d` means detached and you can then run `docker-compose logs` to see the output at any time.
  - To stop the containers, run `docker-compose stop`
  - This is going to take a while. You're downloading 3/8ths of the Internet, and
    building everything on a fairly lightweight machine. You shouldn't have to do
    this all that often, but using a higher tier (i.e., more expensive) droplet
    will speed the process up.

## Common tasks

Do all of these from within the base directory of the repo.

### Resetting the database

To clear the current database and have it seeded again:

- `docker-compose down -v` to stop and remove containers and volumes.
- `docker-compose up -d` to build and start the containers again.

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
- `docker-compose down` stops the containers and removes them.
  - `docker-compose down --rmi all` removes all the images. It will then require rebuilding the images next time.
  - More [Docker options](https://docs.docker.com/compose/reference/down/)
- `docker-compose build` will build the images if things have changed in them

There are many more commands and options for `docker-compose`. They are all documented on the [Docker Compose CLI reference](https://docs.docker.com/compose/reference/).

## Using a custom domain

If you have purchased a domain for your project and would like to use it, set its
DNS `A record` to the IP of your droplet. Stop and remove your containers with `docker-compose down` and then you can use `nano` or similar to edit the `.env` file and change `APP_HOST` to the domain you wish to use. After that use `docker-compose up -d` to start it up again.
