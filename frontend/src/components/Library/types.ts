// Enum for sql dialects
export enum Dialect {
  Postgres = "postgresql",
  MySQL = "mysql",
  SQLite = "sqlite",
  MariaDB = "mariadb",
  Spark = "spark",
  BigQuery = "bigquery",
  IBMDB2 = "db2",
  Hive = "hive",
  Couchbase = "n1ql",
  TransactSQL = "tsql",
}

export type IResultTypeName =
  | "SQL_QUERY_STRING_RESULT"
  | "SQL_QUERY_RUN_RESULT"
  | "SELECTED_TABLES"
  | "CHART_GENERATION_RESULT";

export type Role = "ai" | "human";

export interface IResult {
  type: IResultTypeName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  created_at?: string;
}
export interface ISelectedTablesResult extends IResult {
  type: "SELECTED_TABLES";
  result_id: string;
  content: {
    tables: string[];
  }
}

export interface ISQLQueryStringResult extends IResult {
  type: "SQL_QUERY_STRING_RESULT";
  result_id: string;
  content: {
    sql: string;
    for_chart: boolean;
  }
}

export interface IChartGenerationResult extends IResult {
  type: "CHART_GENERATION_RESULT";
  result_id: string;
  linked_id: string;
  content: {
    chartjs_json: string;
  };
}

export interface ISQLQueryRunResult extends IResult {
  type: "SQL_QUERY_RUN_RESULT";
  linked_id: string;
  content: {
    columns: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[][];
  };
}


export interface IMessageOptions {
  secure_data: boolean;
}

export interface IMessageOut {
  id?: string;
  content: string;
  role: Role;
  created_at?: string;
  options?: IMessageOptions;
}

export type IResultType = ISQLQueryRunResult | ISQLQueryStringResult | ISelectedTablesResult | IChartGenerationResult;
export interface IMessageWithResultsOut {
  message: IMessageOut;
  results?: IResultType[];
}
export interface IConversationWithMessagesWithResultsOut {
  id: string;
  connection_id: string;
  name: string;
  messages: IMessageWithResultsOut[];
}

export interface IConversation {
  id: string;
  name: string;
}

export interface IConnection {
  id: string;
  name: string;
  dsn: string;
  dialect: string;
  is_sample: boolean;
}

export interface IEditConnection {
  name: string;
  dsn: string;
}
