import { api } from "@/api";

export async function updateName(name: string | null) {
  if (name === null || name === "") {
    return false;
  }
  const response = await api.updateUserInfo({ name });
  if (response.status === "ok") {
    console.log("Name updated successfully");
    return true;
  } else {
    console.error("Error updating name");
  }
  return false;
}

const isValidApiKey = (apiKey: string) => {
  return apiKey !== "" && apiKey.startsWith("sk-");
};

export async function updateApiKey(apiKey: string): Promise<boolean> {
  if (!isValidApiKey(apiKey)) {
    // TODO: Show error banner: Invalid OpenAI API key
    alert("Invalid OpenAI API key.");
    return false;
  }
  const response = await api.updateUserInfo({ openai_api_key: apiKey });
  if (response.status === "ok") {
    console.log("API key updated successfully");
    return true;
  } else {
    console.error("Error updating API key");
  }
  return false;
}

export async function updateApiKeyAndSentryPreference(
  apiKey: string,
  sentryEnabled: boolean
): Promise<boolean> {
  if (!isValidApiKey(apiKey)) {
    // TODO: Show error banner: Invalid OpenAI API key
    alert("Invalid OpenAI API key.");
    return false;
  }
  const response = await api.updateUserInfo({
    openai_api_key: apiKey,
    sentryEnabled,
  });
  if (response.status === "ok") {
    console.log("API key and sentry preference updated successfully");
    return true;
  }
  console.error("Error updating API key");
  return false;
}

export async function updateSentryPreference(
  sentryEnabled: boolean
): Promise<boolean> {
  const response = await api.updateUserInfo({ sentryEnabled });
  if (response.status === "ok") {
    return true;
  }
  console.error("Error updating API key");
  return false;
}
