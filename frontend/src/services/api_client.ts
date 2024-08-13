import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

// Initializing Axios instance
const axiosInstance = axios.create();

export const apiURL =
  window.BASE_API_URL || // when served from fastapi
  import.meta.env.VITE_API_URL || // during development
  "http://localhost:7377";

interface AxiosRequestConfigPatch extends Omit<AxiosRequestConfig, "method"> {
  method?: Method; // axios sets it as string, which is unhelpful and can lead to bugs
}

export function configureAxiosInstance(withCredentials: boolean) {
  axiosInstance.defaults.withCredentials = withCredentials;
}

export function isAuthEnabled() {
  return axiosInstance.defaults.withCredentials;
}

export function backendApi<T>(
  config: AxiosRequestConfigPatch
): Promise<AxiosResponse<T>> {
  return axiosInstance.request<T>({ baseURL: apiURL, ...config });
}
