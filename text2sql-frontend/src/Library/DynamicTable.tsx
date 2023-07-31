import { useEffect, useState } from "react";

export const DynamicTable: React.FC<{ data: any }> = ({ data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [dataSubset, setDataSubset] = useState(data.slice(0, rowsPerPage));

  // Create data working subset
  useEffect(() => {
    setDataSubset(
      data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    );
  }, [page, rowsPerPage, data]);

  return (
    <div className="max-w-7xl border-2 border-gray-500 rounded-md bg-gray-900 flex flex-col  overflow-x-scroll no-scrollx">
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-400 overflow-x-scroll">
              <thead>
                <tr className="divide-x divide-gray-400">
                  {dataSubset[0].map((item: any, index: number) => (
                    <th
                      key={index}
                      scope="col"
                      className="py-3.5 pl-4 pr-4 text-left text-sm font-semibold"
                    >
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {dataSubset.map((row: Array<any>, index: number) => {
                  if (index > 0)
                    return (
                      <tr key={index} className="divide-x divide-gray-400">
                        {row.map((item: any, rowIndex: number) => (
                          <td
                            key={rowIndex}
                            className="whitespace-nowrap py-4 pl-4 pr-4 text-sm"
                          >
                            {item}
                          </td>
                        ))}
                      </tr>
                    );
                  return null;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
