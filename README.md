# Text To SQL

![Screenshot of Text2SQL React app showing the generated SQL query and results from a natural language query on the dvdrentals database.](./images/limit_example.jpg)

## What is it?
An app that plugs into your database and uses the schema information to generate SQL queries for you out of natural language queries!


More technically, it's an interface for using LLMs with context for SQL query generation and execution.
The application flow is 1) connect your database 2) start querying.

This allows the app to fetch the table schemas from the database, create an index of {word vector: schema} out of them, then respond to queries by sending the "relevant" parts of your database schema to the LLM as context.



<br/>

## Why is this useful?

Can't we just send our database schema as context to an LLM? Yes, if it's small enough. But also, sending extra information might hurt the prompt quality.
We assume that sending just the right parts of the schema improves the results generally.

<br/>


## What can it do?


## What is this based on?

This is based on the amazing Llamaindex and Langchain, which made it very easy to build the backend part of this in just one day. Wrapping it with a sleek UI took a bit longer however.

Here is a guide to a slightly simpler version of what the text2sql backend does: https://gpt-index.readthedocs.io/en/latest/guides/tutorials/sql_guide.html



