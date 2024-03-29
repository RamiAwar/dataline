# DataLine

## Getting started

To run DataLine, you can use our official docker image and get started in one command:
```bash
docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:v0.1.0
```

You can manage this as you would any other container. `docker start dataline`, `docker stop dataline`

For updating to a new version:
```bash
docker rm dataline
docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:<whatevernewversion>
```

We'll make this stuff easier later on!

To connect to the frontend, you can then visit:
[http://localhost:2222](http://localhost:2222)

### Startup Quest

Go through the following checklist to explore DataLine's features!
- [ ] Create a sample database connection
- [ ] Create a new chat and rename it
- [ ] Start asking questions about your data and getting answers
- [ ] Refresh the page and re-run some SQL queries
- [ ] Click inside an SQL query, modify it, and save your modification for later!
- [ ] Try to modify your sample DB connection and explore the connection editor page
- [ ] Add a profile picture!


## Roadmap
- [x] Connecting to Postgres, SQLite, MySQL databases
- [x] Generating and executing SQL from natural language
- [x] Ability to modify SQL results, save them, and re-run
- [x] Ability to add extra metadata to table schemas and fields for better results
- [ ] Better support for explorative questions
- [ ] Querying data files like CSV, Excel (more connection types)
- [ ] Storing copies of queries and labelling and searching them
- [ ] Charting via natural language
- [ ] Creating live dashboards of charts and results


### 🤓 Connecting to the database

Make sure to add the 'connector' to your database connection string.

If using Postgres, please use psycopg2:

```bash
postgresql+psycopg2://postgres:secret@localhost:5432/adventureworks
```

For MySQL, please use pymysql:
```bash
mysql+pymysql://root@localhost:3306/mydatabase
```
