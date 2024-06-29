import { api } from "@/api";
import { Buffer } from "buffer";

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

export async function isAuthenticated(): Promise<boolean> {
    const hasAuth = await api.hasAuth()
    if (!hasAuth) {
        clearCredentials();
        return true;
    }
    return !!localStorage.getItem(AUTH_KEY);
}
