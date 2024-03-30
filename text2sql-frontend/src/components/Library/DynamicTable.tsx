import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@catalyst/table";

// TODO: Remove after defining this better on backend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DynamicTable: React.FC<{ data: any }> = ({ data }) => {
  const page = 0;
  const rowsPerPage = 25;
  const [dataSubset, setDataSubset] = useState(data.slice(0, rowsPerPage));

  // Create data working subset
  useEffect(() => {
    setDataSubset(
      data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    );
  }, [page, rowsPerPage, data]);
  return (
    <div className="max-w-7xl border border-gray-500 overflow-hidden rounded-xl">
      <Table
        grid
        bleed
        striped
        dense
        className="ml-0 mr-0 [--gutter:theme(spacing.6)] sm:[--gutter:theme(spacing.8)]"
      >
        <TableHead>
          <TableRow>
            {dataSubset[0].map((header: string, index: number) => (
              <TableHeader key={index}>{header}</TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSubset.map((row: string[] | number[], index: number) => {
            if (index > 0)
              return (
                <TableRow key={index}>
                  {row.map((item: string | number, cellIndex: number) => (
                    <TableCell key={cellIndex} className="font-medium pl-8">
                      {item}
                    </TableCell>
                  ))}
                </TableRow>
              );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
