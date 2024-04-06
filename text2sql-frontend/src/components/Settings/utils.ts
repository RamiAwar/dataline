import { api } from "@/api";
import { isAxiosError } from "axios";
import { enqueueSnackbar } from "notistack";

export async function updateName(name: string | null) {
  if (name === null || name === "") {
    return false;
  }
  try {
    await api.updateUserInfo({ name });
    return true;
  } catch {
    enqueueSnackbar({ variant: "error", message: "Error updating name" });
    return false;
  }
}

export async function updateApiKey(apiKey: string | null): Promise<boolean> {
  const invalidKeyMessage = "Invalid OpenAI API key.";
  if (apiKey === null || apiKey === "" || !apiKey.startsWith("sk-")) {
    enqueueSnackbar({ variant: "error", message: invalidKeyMessage });
    return false;
  }
  try {
    await api.updateUserInfo({ openai_api_key: apiKey });
    return true;
  } catch (exception) {
    if (isAxiosError(exception) && exception.response?.status === 422) {
      enqueueSnackbar({ variant: "error", message: invalidKeyMessage });
    } else {
      enqueueSnackbar({ variant: "error", message: "Error updating API key" });
    }
    return false;
  }
}
