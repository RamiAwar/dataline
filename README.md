<p align="center">
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
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

<div align="center">
  <a href="https://github.com/RamiAwar/dataline/actions/workflows/test.yml">
    <img src="https://github.com/RamiAwar/dataline/actions/workflows/test.yml/badge.svg?branch=main&event=push" />
  </a>
</div>

## 🍿 Watch a quick demo
<a href="https://youtu.be/NN99OTVy7uA"><img src="https://github.com/user-attachments/assets/34dfba7c-7ab5-4a35-8fe1-e40b298ef1ae" height="300" alt="DataLine logo"></a>


---

## Index

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
- [Supported Databases](#supported-databases)
- [Deployment](#deployment)

## Who is this for?

Technical or non-technical people who want to explore data, fast. ⚡️⚡️

It also works for backend developers to speed up drafting queries and explore new DBs with ease. 😎

It's especially well-suited for businesses given its security-first 🔒 and open-source 📖 nature.

## What is it?

DataLine is an AI-driven data analysis and visualization tool.

It's privacy-focused, storing everything on your device. No ☁️, only ☀️!

It hides your data from the LLMs used by default, but this can be disabled if the data is not deemed sensitive.

It can connect to a variety of data sources (Postgres, Snowflake, MySQL, Azure SQL Server, Microsoft SQL Server, [Excel](#excel-support), SQLite, CSV, sas7bdat, and more), execute queries, generate charts, and allow for copying the results to build reports quickly.

## Where is it going?

For now, we're trying to help people get insights out of their data, fast.

This is meant to enable non-technical folks to query data and aid data analysts in getting their jobs done 10x as fast.

But you can still influence the direction we go in. We're building this for you, so you have the biggest say.

## Feature Support

- [x] Broad DB support: Postgres, MySQL, Snowflake, [Excel](#excel-support), CSV, SQLite, and more
- [x] Generating and executing SQL from natural language
- [x] Ability to modify SQL results, save them, and re-run
- [x] Better support for explorative questions
- [x] Querying data files like CSV, [Excel](#excel-support), SQLite, sas7bdat (more connection types)
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

DataLine should then be running on port 7377 accessible from your browser: http://localhost:7377

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

### Supported databases

See [instructions file](./dsn-instructions.md) for more details.

### Deployment

The one thing you must configure when deploying DataLine to a custom domain is CORS allowed origins.
To do this, add the environment variable `ALLOWED_ORIGINS` (comma separated list of origins) to your domain name(s).

By default, it is set to `http://localhost:7377,http://0.0.0.0:7377` to make it work with local Docker and local binaries.

For example, running the docker image on a remote server with IP `123.123.12.34`:
```bash
docker run -p 7377:7377 -v dataline:/home/.dataline --name dataline -e ALLOWED_ORIGINS="http://123.123.12.34:7377,https://123.123.12.34:7377" ramiawar/dataline:latest
```


### Excel Support

We support excel files, but they will have to conform to some structure for the time being. We also support multiple sheets - each sheet will be ingested as a separate table.

Right now, we will try to automatically detect the 'header row' and the first column based on some manual data processing (so as to keep things secure). This means that we might detect the wrong things if you have extra rows on top / logos / branding elements.

To ensure the best quality, make sure your first row is the column names, and remove any padding rows/columns from all the sheets. If any sheet fails, the import will fail.

Future improvements to this include optionally allowing LLMs to figure out what the header row is to reduce user effort.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ramiawar.github.io/"><img src="https://avatars.githubusercontent.com/u/8523191?v=4?s=100" width="100px;" alt="Rami Awar"/><br /><sub><b>Rami Awar</b></sub></a><br /><a href="https://github.com/RamiAwar/dataline/commits?author=RamiAwar" title="Code">💻</a> <a href="#design-RamiAwar" title="Design">🎨</a> <a href="https://github.com/RamiAwar/dataline/commits?author=RamiAwar" title="Documentation">📖</a> <a href="#infra-RamiAwar" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#platform-RamiAwar" title="Packaging/porting to new platform">📦</a> <a href="#blog-RamiAwar" title="Blogposts">📝</a> <a href="https://github.com/RamiAwar/dataline/issues?q=author%3ARamiAwar" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://anthonymalkoun.com"><img src="https://avatars.githubusercontent.com/u/26882839?v=4?s=100" width="100px;" alt="anthony2261"/><br /><sub><b>anthony2261</b></sub></a><br /><a href="https://github.com/RamiAwar/dataline/commits?author=anthony2261" title="Code">💻</a> <a href="#ideas-anthony2261" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-anthony2261" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#platform-anthony2261" title="Packaging/porting to new platform">📦</a> <a href="#mentoring-anthony2261" title="Mentoring">🧑‍🏫</a> <a href="#maintenance-anthony2261" title="Maintenance">🚧</a> <a href="https://github.com/RamiAwar/dataline/issues?q=author%3Aanthony2261" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!