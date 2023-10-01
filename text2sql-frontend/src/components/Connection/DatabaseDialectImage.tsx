import React from "react";
import postgresImage from "../../assets/images/postgres.png";
import { CircleStackIcon } from "@heroicons/react/24/outline";

interface DatabaseDialectImageProps {
  databaseDialect: string;
}

const DatabaseDialectImage: React.FC<DatabaseDialectImageProps> = ({
  databaseDialect,
}) => {
  const imageMap: { [key: string]: string } = {
    postgresql: postgresImage,
    // You can add more mappings here as needed
  };

  const imageSrc = imageMap[databaseDialect];

  if (!imageSrc) {
    return <CircleStackIcon className="text-gray-400" />;
  }

  return (
    <img
      className="h-3/4 lg:h-2/3 my-auto"
      src={imageSrc}
      alt={databaseDialect}
    />
  );
};

export default DatabaseDialectImage;
