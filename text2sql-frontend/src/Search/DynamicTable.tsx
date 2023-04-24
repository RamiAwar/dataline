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
    <div className="flow-root">
      <div className="-mx-4 overflow-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-300 overflow-x-scroll">
            <thead>
              <tr className="divide-x divide-gray-200">
                {dataSubset[0].map((item: any, index: number) => (
                  <th
                    key={index}
                    scope="col"
                    className="py-3.5 pl-4 pr-4 text-left text-sm font-semibold text-gray-900"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {dataSubset.map((row: Array<any>, index: number) => {
                if (index > 0)
                  return (
                    <tr key={index} className="divide-x divide-gray-200">
                      {row.map((item: any, rowIndex: number) => (
                        <td
                          key={rowIndex}
                          className="whitespace-nowrap py-4 pl-4 pr-4 text-sm text-gray-900"
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
  );
};
