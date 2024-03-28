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
import { updateApiKey } from "./utils";
import { useUserInfo } from "../Providers/UserInfoProvider";
import { enqueueSnackbar } from "notistack";

export function OpenAIKeyPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [, setUserInfo] = useUserInfo();

  async function saveApiKey() {
    // Check that not empty
    if (apiKey === "") {
      enqueueSnackbar({
        variant: "error",
        message: "Cannot store empty key",
      });
      return;
    }

    const sucessful = await updateApiKey(apiKey);
    if (!sucessful) {
      return;
    }

    setUserInfo((prev) => ({ ...prev, openaiApiKey: apiKey }));
    setIsOpen(false);
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
        <Button onClick={() => saveApiKey()}>Continue</Button>
      </AlertActions>
    </Alert>
  );
}
