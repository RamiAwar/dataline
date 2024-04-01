import {
  Alert,
  AlertActions,
  AlertBody,
  AlertDescription,
  AlertTitle,
} from "@components/Catalyst/alert";
import { Button } from "@components/Catalyst/button";
import { useState } from "react";
import MaskedInput from "@components/Settings/MaskedInput";
import { enqueueSnackbar } from "notistack";
import { useUpdateUserInfo } from "@/hooks";

export function OpenAIKeyPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const { mutate } = useUpdateUserInfo({
    onSuccess() {
      setIsOpen(false);
    },
  });

  function saveApiKey() {
    // Check that not empty
    if (apiKey === null || apiKey === "") {
      enqueueSnackbar({
        variant: "error",
        message: "Cannot store empty key",
      });
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      // TODO: Show error banner: Invalid OpenAI API key
      enqueueSnackbar({
        variant: "error",
        message: "Invalid OpenAI API key.",
      });
      return;
    }

    mutate({ openai_api_key: apiKey });
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      saveApiKey();
    }
  }

  return (
    <Alert open={isOpen} onClose={() => setIsOpen(true)} size="sm">
      <AlertTitle>Configure OpenAI</AlertTitle>
      <AlertDescription>
        To continue, please enter your OpenAI api key.
      </AlertDescription>
      <AlertBody>
        <MaskedInput
          autoFocus
          value={apiKey || ""}
          onChange={setApiKey}
          onKeyUp={handleKeyPress}
        />
      </AlertBody>
      <AlertActions>
        <Button onClick={saveApiKey}>Continue</Button>
      </AlertActions>
    </Alert>
  );
}
