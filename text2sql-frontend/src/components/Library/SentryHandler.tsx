import * as Sentry from "@sentry/react";
import { useUserInfo } from "@components/Providers/UserInfoProvider";
import { useState, useEffect } from "react";

function enableSentry() {
  //Sentry.isInitialized()
  const client = Sentry.getClient();
  if (client) {
    client.getOptions().enabled = true;
  } else {
    Sentry.init({
      dsn: "https://f2e8c2b48c9c369896ae2ef4f872b88b@o4506888560508928.ingest.us.sentry.io/4506888713338880",
      integrations: [Sentry.browserTracingIntegration()],
      // Performance Monitoring
      tracesSampleRate: 0.05, //  Capture 5% of the transactions
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ["localhost"], //, /^https:\/\/yourserver\.io\/api/],
    });
  }
}

function disableSentry() {
  Sentry.close();
}

export default function SentryHandler() {
  const [userInfo] = useUserInfo();
  const [sentryEnabled, setSentryEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (userInfo === null || !userInfo.isLoaded) return;
    if (userInfo.sentryEnabled !== sentryEnabled) {
      setSentryEnabled(userInfo.sentryEnabled);
    }
  }, [userInfo, sentryEnabled]);

  useEffect(() => {
    if (!sentryEnabled) {
      disableSentry();
    } else {
      enableSentry();
    }
  }, [sentryEnabled]);

  return null;
}
