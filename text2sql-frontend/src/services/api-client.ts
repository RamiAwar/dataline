// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// import { queryCache } from "@tanstack/react-query";
// const apiURL = process.env.REACT_APP_API_URL;
const apiURL = "http://localhost:7377";

async function client(
  endpoint: string,
  { data, headers: customHeaders, method = "GET", ...customConfig } = {}
) {
  const config = {
    method,
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      ...customHeaders,
    },
    ...customConfig,
  };

  return window
    .fetch(`${apiURL}/${endpoint}`, config)
    .then(async (response) => {
      if (response.status === 401) {
        // refresh the page for them
        window.location.assign(window.location);
        return Promise.reject({ message: "Please re-authenticate." });
      }
      const data = await response.json();
      if (response.ok) {
        return data;
      } else {
        return Promise.reject({ data, status: response.status });
      }
    });
}

export { client };
