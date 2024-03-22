# DataLine

### Running this

For the backend, simple FastAPI app with poetry. Make sure you have the latest poetry installed, and an OPENAI API KEY configured in your .env file as (OPENAI_API_KEY=...):

```bash
poetry install
uvicorn main:app --reload --port=7377
```

For the frontend, React app with npm (started off as Svelte, then moved to React to allow more people to contribute)
```bash
npm i
npm run dev
```


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
