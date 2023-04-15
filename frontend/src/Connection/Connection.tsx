import { useEffect, useState } from "react";
import { api } from "../api";
import { isApiError } from "../api";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { useSession } from "../Providers/SessionProvider";

export const Connection = () => {
  const [connectionString, setConnectionString] = useState<string>("");

  const navigate = useNavigate();

  const [, setSession] = useSession();

  useEffect(() => {
    setSession(null);
  }, [setSession]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = await api.connect(connectionString);
    if (isApiError(result)) {
      alert(result.message);
      return;
    }
    setSession(result.session_id);
    navigate(Routes.Search);
  };

  return (
    <>
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="mt-6 text-center text-5xl font-bold tracking-tight text-gray-900">
            Text2SQL
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
            Connect to your database
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="connection-string"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Connection String
                </label>
                <div className="mt-2">
                  <input
                    id="connection-string"
                    name="connection-string"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
