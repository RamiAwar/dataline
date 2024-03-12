import {
  Alert,
  AlertActions,
  AlertBody,
  AlertDescription,
  AlertTitle,
} from "@components/Catalyst/alert";
import { Button } from "@components/Catalyst/button";
import { SwitchField, Switch } from "@components/Catalyst/switch";
import { Label } from "@components/Catalyst/fieldset";
import { useState } from "react";
import MaskedInput from "@components/Settings/MaskedInput";
import { updateApiKeyAndSentryPreference } from "./utils";
import { useUserInfo } from "@components/Providers/UserInfoProvider";

export function OpenAIKeyPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [userInfo, setUserInfo] = useUserInfo();
  const [sentryEnabled, setSentryEnabled] = useState(
    userInfo === null || userInfo.sentryEnabled === null
      ? true
      : userInfo.sentryEnabled
  );

  async function submit() {
    // Check that not empty
    if (apiKey === "") {
      alert("Cannot store empty key");
      return;
    }

    const sucessful = await updateApiKeyAndSentryPreference(
      apiKey,
      sentryEnabled
    );
    if (!sucessful) {
      return;
    }

    setUserInfo((prev) => ({ ...prev, openaiApiKey: apiKey, sentryEnabled }));
    setIsOpen(false);
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      submit();
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
        <SwitchField className="mt-4">
          <Label>Send Error Reports</Label>
          <Switch
            name="allow_sentry"
            checked={sentryEnabled}
            onChange={setSentryEnabled}
          />
        </SwitchField>
      </AlertBody>
      <AlertActions>
        <Button onClick={() => submit()}>Continue</Button>
      </AlertActions>
    </Alert>
  );
}
