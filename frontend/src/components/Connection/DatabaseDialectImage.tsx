import React from "react";
import postgresImage from "../../assets/images/postgres.png";
import sqliteImage from "../../assets/images/sqlite.png";
import sqlServerImage from "../../assets/images/sql_server.png";
import snowflakeImage from "../../assets/images/snowflake.png";
import mysqlImage from "../../assets/images/mysql.png";
import netflixImage from "../../assets/images/netflix.png";
import spotifyImage from "../../assets/images/spotify.png";
import titanicImage from "../../assets/images/titanic.png";
import { CircleStackIcon } from "@heroicons/react/24/outline";

interface ConnectionImageProps {
  databaseDialect: string;
  name: string;
}

const ConnectionImage: React.FC<ConnectionImageProps> = ({
  databaseDialect,
  name,
}) => {
  const imageMap: { [key: string]: string } = {
    postgresql: postgresImage,
    sqlite: sqliteImage,
    mssql: sqlServerImage,
    snowflake: snowflakeImage,
    mysql: mysqlImage,
    // You can add more mappings here as needed
  };
  let imageSrc = imageMap[databaseDialect];

  if (name.toLowerCase().includes("netflix")) {
    imageSrc = netflixImage;
  } else if (name.toLowerCase().includes("spotify")) {
    imageSrc = spotifyImage;
  } else if (name.toLowerCase().includes("titanic")) {
    imageSrc = titanicImage;
  }

  if (!imageSrc) {
    return <CircleStackIcon className="text-gray-400 h-full" />;
  }

  return (
    <img
      className="h-full object-contain"
      src={imageSrc}
      alt={databaseDialect}
    />
  );
};

export default ConnectionImage;
