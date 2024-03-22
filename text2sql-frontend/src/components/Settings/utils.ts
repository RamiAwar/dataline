import { api } from "@/api";
import { enqueueSnackbar } from "notistack";

export async function updateName(name: string | null) {
  if (name === null || name === "") {
    return false;
  }
  try {
    const response = await api.updateUserInfo({ name });
    return true;
  } catch {
    enqueueSnackbar({ variant: "error", message: "Error updating name" });
    return false;
  }
}

export async function updateApiKey(apiKey: string | null): Promise<boolean> {
  if (apiKey === null || apiKey === "" || !apiKey.startsWith("sk-")) {
    // TODO: Show error banner: Invalid OpenAI API key
    enqueueSnackbar({
      variant: "error",
      message: "Invalid OpenAI API key.",
    });
    return false;
  }
  try {
    const response = await api.updateUserInfo({ openai_api_key: apiKey });
    return true;
  } catch {
    enqueueSnackbar({ variant: "error", message: "Error updating API key" });
    return false;
  }
}
