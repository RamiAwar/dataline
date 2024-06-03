// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// import { queryCache } from "@tanstack/react-query";
// const apiURL = process.env.REACT_APP_API_URL;
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

// Initializing Axios instance
const axiosInstance = axios.create();

// const apiURL = import.meta.env.VITE_API_URL || "";
export const apiURL = "http://localhost:7377";

interface AxiosRequestConfigPatch extends Omit<AxiosRequestConfig, "method"> {
  method?: Method; // axios sets it as string, which is unhelpful and can lead to bugs
}

export function backendApi<T>(
  config: AxiosRequestConfigPatch
): Promise<AxiosResponse<T>> {
  return axiosInstance.request({ baseURL: apiURL, ...config });
}
