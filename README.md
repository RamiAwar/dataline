# DataLine

- [Getting started](#getting-started)
  - [Setup](#setup)
    - [Docker](#docker)
    - [Windows](#windows)
    - [Mac](#mac)
    - [Linux](#linux)
    - [Docker](#docker)
    - [Running manually](#running-manually)
  - [Startup Quest](#startup-quest)
- [Roadmap](#roadmap)

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

## Roadmap

- [x] Connecting to Postgres, MySQL databases
- [x] Generating and executing SQL from natural language
- [x] Ability to modify SQL results, save them, and re-run
- [x] Ability to add extra metadata to table schemas and fields for better results
- [x] Better support for explorative questions
- [x] Querying data files like CSV, SQLite (more connection types)
- [x] Charting via natural language
- [ ] Storing copies of queries and labelling and searching them
- [ ] Creating live dashboards of charts and results
