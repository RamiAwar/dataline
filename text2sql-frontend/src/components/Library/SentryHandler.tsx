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
      integrations: [
        Sentry.browserTracingIntegration(),
        // Sentry.replayIntegration({
        //   // maskAllText: false,
        //   // blockAllMedia: false,
        // }),
      ],
      beforeSend(event) {
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.data === undefined) return breadcrumb;
        const filteredKVPairs = Object.entries(breadcrumb.data).map(
          ([key, value]) => [
            key,
            key.toLowerCase().includes("result") ? "[Filtered]" : value,
          ]
        );
        breadcrumb.data = Object.fromEntries(filteredKVPairs);
        //   data?: {
        //     [key: string]: any;
        // };
        return breadcrumb;
      },
      // Performance Monitoring
      tracesSampleRate: 1.0, //  Capture 100% of the transactions
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ["localhost"], //, /^https:\/\/yourserver\.io\/api/],
      // Session Replay
      //   replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      //   replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
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
