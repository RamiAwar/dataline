# Database Connection Instructions

This document provides instructions on how to connect to different types of databases using Data Source Names (DSNs) in our project.

## Supported Databases

- [Postgres](#postgresql)
- [MySQL](#mysql)
- [Snowflake](#snowflake)
- [SQL Server](#sql-server)
- [File-based databases](#file-based-databases)

## General DSN Format

```
[database_type]://[username]:[password]@[host]:[port]/[database_name]
```

## Database-Specific Instructions

### PostgreSQL

#### DSN Format

```
postgres://[username]:[password]@[host]:[port]/[database_name]
```

<!--
#### Additional Notes

- [Any specific notes or requirements for Database 1] -->

### MySQL

#### DSN Format

```
mysql://[username]:[password]@[host]:[port]/[database_name]
```

### Snowflake

#### DSN Format

```
snowflake://[username]:[password]@[host]/[database_path]
```

See [this article](https://ramiawar.medium.com/chat-with-your-snowflake-database-27bfd5c50d48) for more examples on linking a snowflake db to Dataline.

### SQL Server

#### DSN Format

```
mssql://[username]:[password]@[host]:[port]/[database_name]?driver=[driver_name]&TrustServerCertificate=yes
```

Example `driver_name`: `ODBC+Driver+18+for+SQL+Server`. Note that spaces are replaced by plus signs `+`.<br/>
Make sure the driver you specify in the DSN is installed locally on the device running Dataline. Driver installation instructions can be found [here](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server).

### File-based databases

You can simply upload the file into Dataline when creating a new connection!

<!-- ## Troubleshooting

- [Common issue 1]
- [Common issue 2]

## Need Help?

If you encounter any problems, please [instructions for seeking help]. -->
