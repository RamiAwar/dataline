import React from "react";
import postgresImage from "../../assets/images/postgres.png";
import sqliteImage from "../../assets/images/sqlite.png";
import snowflakeImage from "../../assets/images/snowflake.png";
import mysqlImage from "../../assets/images/mysql.png";
import { CircleStackIcon } from "@heroicons/react/24/outline";

interface DatabaseDialectImageProps {
  databaseDialect: string;
}

const DatabaseDialectImage: React.FC<DatabaseDialectImageProps> = ({
  databaseDialect,
}) => {
  const imageMap: { [key: string]: string } = {
    postgresql: postgresImage,
    sqlite: sqliteImage,
    snowflake: snowflakeImage,
    mysql: mysqlImage,
    // You can add more mappings here as needed
  };

  const imageSrc = imageMap[databaseDialect];

  if (!imageSrc) {
    return <CircleStackIcon className="text-gray-400 h-full" />;
  }

  return <img className="h-full" src={imageSrc} alt={databaseDialect} />;
};

export default DatabaseDialectImage;
