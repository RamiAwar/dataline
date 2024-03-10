import { api } from "@/api";

export async function updateName(name: string | null) {
  if (name === null || name === "") {
    return;
  }
  let response = await api.updateUserInfo({ name });
  if (response.status === "ok") {
    console.log("Name updated successfully");
  } else {
    console.error("Error updating name");
  }
}

export async function updateApiKey(apiKey: string | null): Promise<boolean> {
  if (apiKey === null || apiKey === "" || !apiKey.startsWith("sk-")) {
    // TODO: Show error banner: Invalid OpenAI API key
    alert("Invalid OpenAI API key.")
    return false;
  }
  let response = await api.updateUserInfo({ openai_api_key: apiKey });
  if (response.status === "ok") {
    console.log("API key updated successfully");
    return true;
  } else {
    console.error("Error updating API key");
  }
  return false;
}
