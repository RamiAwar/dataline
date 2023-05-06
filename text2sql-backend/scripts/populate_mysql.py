import mysql.connector

# Connect to the MySQL container
mydb = mysql.connector.connect(
  host="localhost",
  user="root",
)

# Create a cursor object
mycursor = mydb.cursor()

# Create the database
mycursor.execute("CREATE DATABASE IF NOT EXISTS mydatabase")

# Connect to the database
mydb = mysql.connector.connect(
  host="localhost",
  user="root",
  database="mydatabase"
)

# Create a cursor object
mycursor = mydb.cursor()

# Create a table for users
mycursor.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255))")

# Insert some users
sql = "INSERT INTO users (name, email) VALUES (%s, %s)"
val = [
  ('John Doe', 'john@example.com'),
  ('Jane Doe', 'jane@example.com'),
  ('Bob Smith', 'bob@example.com'),
  ('Alice Smith', 'alice@example.com')
]
mycursor.executemany(sql, val)
mydb.commit()

# Create a table for orders
mycursor.execute("CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, product VARCHAR(255), price DECIMAL(10, 2))")

# Insert some orders
sql = "INSERT INTO orders (user_id, product, price) VALUES (%s, %s, %s)"
val = [
  (1, 'Widget', 19.99),
  (1, 'Gadget', 29.99),
  (2, 'Thingamajig', 9.99),
  (3, 'Whatchamacallit', 49.99),
  (3, 'Doohickey', 39.99),
  (4, 'Thingy', 14.99)
]
mycursor.executemany(sql, val)
mydb.commit()

print("Tables created and data inserted successfully!")
