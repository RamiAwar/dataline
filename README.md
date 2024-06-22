<p align="center">
  <a href="https://dataline.app"><img src="https://github.com/RamiAwar/dataline/assets/8523191/97e3a26c-e064-4e4e-b804-4e739986dbe9" alt="DataLine logo"></a>
</p>

<p align="center">
    <strong>Chat with your data using natural language</strong>
</p>
<p align="center">
    <em>Gone are the days of time-consuming querying! Generate charts, tables, reports in seconds.</em>
</p>
<div align="center">
<img src="https://img.shields.io/github/downloads/ramiawar/dataline/total?style=flat&color=%2322c55e">
<img src="https://img.shields.io/docker/pulls/ramiawar/dataline?color=%2338bdf8">
</div>

---

- [Who is this for](#who-is-this-for)
- [What is it](#what-is-it)
- [Roadmap](#where-is-it-going)
- [Getting started](#getting-started)
  - [Setup](#setup)
    - [Windows](#windows)
    - [Mac](#mac)
    - [Linux](#linux)
    - [Docker](#docker)
    - [Running manually](#running-manually)
  - [Startup Quest](#startup-quest)


## Who is this for?

Technical or non-technical people who want to explore data, fast. 
It also works for backend developers to speed up drafting SQL queries and explore new DBs.
It's specially well-suited for businesses given it's security-first and open-source nature.

## What is it?

DataLine is a simple tool for chatting with your data. It's privacy-focused, running only locally and storing everything on your device. It hides your data from the LLMs used by default, but this can be disabled if the data is not deemed sensitive.

It can connect to a variety of data sources (Postgres, MySQL, SQLite, CSV, and more), execute queries, generate charts, and allow for copying the results to build reports quickly.

## Where is it going?

For now, we're trying to help people get insights out of their data, fast.
This is meant to enable non-technical folks to query data and aid data analysts in getting their jobs done 10x as fast.

## Feature Support
- [x] Connecting to Postgres, MySQL databases
- [x] Generating and executing SQL from natural language
- [x] Ability to modify SQL results, save them, and re-run
- [x] Better support for explorative questions
- [x] Querying data files like CSV, SQLite (more connection types)
- [x] Charting via natural language
- [x] Modifying chart queries and re-rendering/refreshing charts
- [ ] Reporting tools (copy tables, copy charts)
- [ ] Storing copies of queries and labelling and searching them
- [ ] Creating dashboards
- [ ] Increasing connection support (NoSQL, Elasticsearch, ...)


## Getting started

### Setup

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
docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:latest
```

You can manage this as you would any other container. `docker start dataline`, `docker stop dataline`

For updating to a new version, just remove the container and rerun the command. This way the volume is persisted across updates.

```bash
docker rm dataline
docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:latest
```

To connect to the frontend, you can then visit:
[http://localhost:2222](http://localhost:2222)

#### Running manually

Check the [backend](./backend/README.md) and [frontend](./frontend/README.md) readmes.

### Startup Quest

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
