// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// import { queryCache } from "@tanstack/react-query";
// const apiURL = process.env.REACT_APP_API_URL;
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { Buffer } from "buffer";

// Initializing Axios instance
const axiosInstance = axios.create();

// const apiURL = import.meta.env.VITE_API_URL || "";
export const apiURL = "http://localhost:7377";

const AUTH_KEY = "auth";

export function setCredentials(username: string, password: string): void {
  if (username && password) {
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    localStorage.setItem(AUTH_KEY, authString);
  } else {
    clearCredentials();
  }
}

export function getCredentials(): {
  username: string;
  password: string;
} | null {
  const auth = localStorage.getItem(AUTH_KEY);
  if (auth) {
    try {
      const [username, password] = Buffer.from(auth, "base64")
        .toString("utf-8")
        .split(":");
      return { username, password };
    } catch (error) {
      console.error("Error decoding credentials:", error);
      clearCredentials();
    }
  }
  return null;
}

export function clearCredentials(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_KEY);
}

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
  const headers = { ...config.headers };
  if (!config.skipAuth && auth) {
    headers.Authorization = `Basic ${auth}`;
  }

  return axiosInstance.request<T>({
    baseURL: apiURL,
    ...config,
    headers,
  });
}
