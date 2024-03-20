# DataLine

## Running

To run DataLine, you can use our official docker image:
```docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/dataline/backend/dataline/configuration --name dataline ramiawar/dataline:v0.1.0```



### ⚠️ Connecting to the database

Make sure to add the 'connector' to your database connection string. 

If using Postgres, please use psycopg2:

```bash
postgresql+psycopg2://postgres:secret@localhost:5432/adventureworks
```

For MySQL, please use pymysql:
```bash
mysql+pymysql://root@localhost:3306/mydatabase
```
