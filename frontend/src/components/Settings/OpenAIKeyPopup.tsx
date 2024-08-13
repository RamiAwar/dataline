import {
  Alert,
  AlertActions,
  AlertBody,
  AlertDescription,
  AlertTitle,
} from "@components/Catalyst/alert";
import { Button } from "@components/Catalyst/button";
import { Label } from "@components/Catalyst/fieldset";
import { SwitchField, Switch } from "@components/Catalyst/switch";
import { useState } from "react";
import MaskedInput from "@components/Settings/MaskedInput";
import { enqueueSnackbar } from "notistack";
import { useUpdateUserInfo } from "@/hooks";
import { Spinner } from "../Spinner/Spinner";
import { Input } from "@components/Catalyst/input";

export function OpenAIKeyPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [sentryEnabled, setSentryEnabled] = useState(true);

  const { mutate, isPending } = useUpdateUserInfo({
    onSuccess() {
      setIsOpen(false);
    },
  });

  function saveApiKey() {
    // Check that not empty
    if (isPending) return;
    if (apiKey === null || apiKey === "") {
      enqueueSnackbar({
        variant: "error",
        message: "Cannot store empty key",
      });
      return;
    }

    mutate({
      openai_api_key: apiKey,
      sentry_enabled: sentryEnabled,
      ...(baseUrl && { openai_base_url: baseUrl }),
    });
  }

  function handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      saveApiKey();
    }
  }

  return (
    <Alert open={isOpen} onClose={() => setIsOpen(true)} size="xl">
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
          placeholder="OpenAI API key"
        />
      </AlertBody>
      <AlertDescription className="!text-xs">
        Please setup your API key with{" "}
        <a
          className="underline"
          target="_blank"
          href="https://help.openai.com/en/articles/8867743-assign-api-key-permissions"
        >
          full permissions{" "}
        </a>
        to use DataLine. You can create one on the{" "}
        <a
          className="underline"
          target="_blank"
          href="https://platform.openai.com/api-keys"
        >
          OpenAI platform.
        </a>
      </AlertDescription>

      <AlertBody className="mt-8 mr-9 sm:mr-11">
        <Input
          name="base-url"
          value={baseUrl || ""}
          onChange={(event) => setBaseUrl(event.target.value)}
          onKeyUp={handleKeyPress}
          className={"font-mono"}
          placeholder="Base URL (Optional)"
        />
      </AlertBody>
      <AlertDescription className="!text-xs">
        Base URL path for API requests, leave blank if not using a proxy or
        service emulator.
      </AlertDescription>
      <AlertBody>
        <div className="flex">
          <SwitchField className="mt-4">
            <Label>Send Error Reports</Label>
            <Switch
              name="allow_sentry"
              color="green"
              checked={sentryEnabled}
              onChange={setSentryEnabled}
            />
          </SwitchField>
        </div>
      </AlertBody>
      <AlertDescription className="!text-xs">
        We use Sentry to track errors and improve our service. You can disable
        this feature at any time.
      </AlertDescription>
      <AlertActions>
        <Button disabled={isPending} onClick={saveApiKey}>
          <div className="flex gap-2 items-center">
            Continue
            {isPending && <Spinner />}
          </div>
        </Button>
      </AlertActions>
    </Alert>
  );
}
