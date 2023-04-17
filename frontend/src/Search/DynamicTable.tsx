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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Users
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all the users in your account including their name, title,
            email and role.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add user
          </button>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr className="divide-x divide-gray-200">
                  {dataSubset[0].map((item: any, index: number) => (
                    <th
                      key={index}
                      scope="col"
                      className="py-3.5 pl-4 pr-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {dataSubset.map((row: any, index: number) => {
                  if (index > 0)
                    return (
                      <tr key={index} className="divide-x divide-gray-200">
                        {row.map((item: any, rowIndex: number) => (
                          <td
                            key={rowIndex}
                            className="whitespace-nowrap py-4 pl-8 pr-4 text-sm text-gray-900 sm:pl-0"
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
