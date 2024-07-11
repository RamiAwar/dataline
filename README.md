<p align="center">
  <a href="https://dataline.app"><img src="https://github.com/RamiAwar/dataline/assets/8523191/97e3a26c-e064-4e4e-b804-4e739986dbe9" alt="DataLine logo"></a>
</p>

<p align="center">
    <strong>💬 Chat with your data using natural language 📊</strong>
</p>
<p align="center">
    Introducing DataLine, <em>the simplest and fastest way</em>⚡️ to analyze and visualize your data!<br><em>Generate and export charts, tables, reports in seconds with DataLine - Your AI-driven data analysis and visualization tool</em> 🤓
</p>
<div align="center">
<img src="https://img.shields.io/github/downloads/ramiawar/dataline/total?style=flat&color=%2322c55e">
<img src="https://img.shields.io/docker/pulls/ramiawar/dataline?color=%2338bdf8">
</div>

---

- [Who is this for](#who-is-this-for)
- [What is it](#what-is-it)
- [Roadmap](#where-is-it-going)
- [Feature Support](#feature-support)
- [Getting started](#getting-started)
  - [Windows](#windows)
  - [Mac](#mac)
  - [Linux](#linux)
  - [Docker](#docker)
  - [Running manually](#running-manually)
- [Authentication](#authentication)
  - [With Docker](#with-docker)
- [Startup Quest](#startup-quest)
- [Deployment](#deployment)

## Who is this for?

Technical or non-technical people who want to explore data, fast. ⚡️⚡️

It also works for backend developers to speed up drafting queries and explore new DBs with ease. 😎

It's especially well-suited for businesses given its security-first 🔒 and open-source 📖 nature.

## What is it?

DataLine is an AI-driven data analysis and visualization tool.

It's privacy-focused, storing everything on your device. No ☁️, only ☀️!

It hides your data from the LLMs used by default, but this can be disabled if the data is not deemed sensitive.

It can connect to a variety of data sources (Postgres, Snowflake, MySQL, SQLite, CSV, sas7bdat, and more), execute queries, generate charts, and allow for copying the results to build reports quickly.

## Where is it going?

For now, we're trying to help people get insights out of their data, fast.

This is meant to enable non-technical folks to query data and aid data analysts in getting their jobs done 10x as fast.

But you can still influence the direction we go in. We're building this for you, so you have the biggest say.

## Feature Support

- [x] Broad DB support: Postgres, MySQL, Snowflake, CSV, SQLite, and more
- [x] Generating and executing SQL from natural language
- [x] Ability to modify SQL results, save them, and re-run
- [x] Better support for explorative questions
- [x] Querying data files like CSV, SQLite, sas7bdat (more connection types)
- [x] Charting via natural language
- [x] Modifying chart queries and re-rendering/refreshing charts

With a lot more coming soon. You can still influence what we build, so if you're a user and you're down for it, we'd love to interview you! Book some time with one of us here:

- [Rami](https://calendly.com/ramiawar/quick)
- [Anthony](https://calendly.com/anthonymalkoun)

## Getting started

There are multiple ways of setting up DataLine, simplest being using a binary executable. This allows you to download a file and run it to get started.

A more flexible option is using our hosted Docker image. This allows you to setup authentication and other features if you need them.

#### Windows

Head over to our [releases](https://github.com/RamiAwar/dataline/tags) page, and open the most recent one. There you should find a windows-exe.zip file. Download it, unzip it, and run the `DataLine.exe` file.

You might get a `"Windows protected your PC"` message, which is normal (more info -> run anyway). Finally, open http://localhost:7377/ in your browser.

#### Mac

Homebrew

```bash
# install dataline
brew tap ramiawar/dataline
brew install dataline

# run dataline
dataline
```

DataLine should then be running on port 5173 accessible from your browser: http://localhost:5173

#### Linux

You can use Homebrew, see the [Mac](#mac) section.

You may also wish to use the binary instead, to do so, follow the instructions in the [Windows](#windows) section, and use the `dataline-linux.tar.zip` file instead.

#### Docker

You can also use our official docker image and get started in one command. This is more suitable for business use:

```bash
docker run -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:latest
```

You can manage this as you would any other container. `docker start dataline`, `docker stop dataline`

For updating to a new version, just remove the container and rerun the command. This way the volume is persisted across updates.

```bash
docker rm dataline
docker run -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:latest
```

To connect to the frontend, you can then visit:
[http://localhost:7377](http://localhost:7377)

#### Running manually

Check the [backend](./backend/README.md) and [frontend](./frontend/README.md) readmes.

## Authentication

DataLine also supports basic auth 🔒 in self-hosted mode 🥳 in case you're hosting it and would like to secure it with a username/password.

Auth is NOT supported ❌ when running the DataLine executable.

To enable authentication on the self-hosted version, add the environment variables AUTH_USERNAME and AUTH_PASSWORD while launching the service. ✅

### With Docker

Inject the env vars with the docker run command as follows:
`docker run -p 7377:7377 -v dataline:/home/.dataline --name dataline -e AUTH_USERNAME=admin -e AUTH_PASSWORD=admin ramiawar/dataline:latest`

We plan on supporting multiple user auth in the future, but for now it supports a single user by default.

## Startup Quest

Go through the following checklist to explore DataLine's features!

- [ ] Create a sample database connection
- [ ] Create a new chat and rename it
- [ ] Start asking questions about your data and getting answers
- [ ] Refresh the page and re-run some SQL queries
- [ ] Click inside an SQL query, modify it, and save your modification for later!
- [ ] Try to modify your sample DB connection and explore the connection editor page
- [ ] Try asking for a chart!
- [ ] To really challenge it, ask a question that is answered with multiple results (charts, tables, etc.) - [example](https://www.youtube.com/watch?v=6ouSok9bOVo)
- [ ] Add a profile picture

### Deployment

The one thing you must configure when deploying DataLine to a custom domain is CORS allowed origins.
To do this, add the environment variable `ALLOWED_ORIGINS` (comma separated list of origins) to your domain name(s).

By default, it is set to `http://localhost:7377,http://0.0.0.0:7377` to make it work with local Docker and local binaries.

For example, running the docker image on a remote server with IP `123.123.12.34`:
```bash
docker run -p 7377:7377 -v dataline:/home/.dataline --name dataline -e ALLOWED_ORIGINS="http://123.123.12.34:7377,https://123.123.12.34:7377" ramiawar/dataline:latest
```
