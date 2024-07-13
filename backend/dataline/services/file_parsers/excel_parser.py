import logging
from sqlite3 import Connection
from typing import BinaryIO

import pandas as pd

logger = logging.getLogger(__name__)


def find_non_nan(value: pd.Series) -> bool:
    return value.notna().any()


def process_excel(file: BinaryIO) -> dict[str, pd.DataFrame]:
    # Storing the processed df for each sheet
    processed_sheets: dict[str, pd.DataFrame] = {}

    # Get all sheet names
    sheet_names = pd.ExcelFile(file).sheet_names
    sheet_dfs = pd.read_excel(file, sheet_name=None, header=None)

    for sheet_name in sheet_names:
        # Reading the sheet (without headers)
        sheet_key = str(sheet_name)
        logger.debug(f"Processing sheet: {sheet_key}")
        df = sheet_dfs[sheet_key]

        # Finding the first row with non-NaN values to use as a column header
        header_row_idx = df.apply(find_non_nan, axis=1).idxmax()
        headers = df.loc[header_row_idx].dropna().values

        # Finding the first column with non-NaN values to use as the first column
        header_col_idx = int(df.apply(find_non_nan, axis=0).idxmax())

        # HEADER CORRECTION
        correct_headers = df.loc[header_row_idx]
        df.columns = list(correct_headers)
        # Remove the header row from the DataFrame if it's now part of the data
        df.drop(df.index[int(header_row_idx)], inplace=True)

        # REMOVE EMPTY COLUMNS
        # Droping any columns before the identified column header
        if header_col_idx > 0:
            df.drop(df.columns[:header_col_idx], axis=1, inplace=True)
        # Resetting the column names to the identified column headers
        df.columns = list(headers)

        # CLEANUP
        # Droping any rows and columns that are completely NaN
        df.dropna(how="all", axis=0, inplace=True)
        df.dropna(how="all", axis=1, inplace=True)
        df.reset_index(drop=True, inplace=True)

        # Storing the processed DataFrame in the dictionary
        processed_sheets[sheet_key] = df

    return processed_sheets


class ExcelParserService:

    @classmethod
    def to_sqlite_offline_secure(cls, file: BinaryIO, conn: Connection, name: str) -> None:
        """
        Attempt to parse an Excel file manually and store the data in a SQLite database.
        """
        processed_sheets = process_excel(file)
        for sheet in processed_sheets:
            table_name = sheet.replace(" ", "_").lower()
            df = processed_sheets[sheet]
            df.to_sql(table_name, conn, if_exists="replace", index=False)