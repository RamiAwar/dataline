import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

// Initializing Axios instance
const axiosInstance = axios.create();

export const apiURL = import.meta.env.VITE_API_URL || "http://localhost:7377";

interface AxiosRequestConfigPatch extends Omit<AxiosRequestConfig, "method"> {
  method?: Method; // axios sets it as string, which is unhelpful and can lead to bugs
}

// Create new type with skipAuth
export type AxiosRequestConfigWithSkipAuth = AxiosRequestConfigPatch & {
  skipAuth?: boolean;
};

export function backendApi<T>(
  config: AxiosRequestConfigWithSkipAuth
): Promise<AxiosResponse<T>> {
  const auth = localStorage.getItem("auth");
  const headers: AxiosRequestConfigWithSkipAuth["headers"] = {
    ...config.headers,
  };
  if (!config.skipAuth && auth) {
    headers.Authorization = `Basic ${auth}`;
  }

  return axiosInstance.request<T>({
    baseURL: apiURL,
    ...config,
    headers,
  });
}
