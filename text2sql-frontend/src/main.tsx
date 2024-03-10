import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

//...
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://f2e8c2b48c9c369896ae2ef4f872b88b@o4506888560508928.ingest.us.sentry.io/4506888713338880",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // maskAllText: false,
      // blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost"], //, /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

(async () => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
