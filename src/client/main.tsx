import React from "react";
import ReactDOM from "react-dom/client";

import { AppRouter } from "./app/router";
import "./app/app.css";
import { startRotatingFavicon } from "./lib/rotating-favicon";
import { UiProvider } from "./lib/ui";

startRotatingFavicon();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UiProvider>
      <AppRouter />
    </UiProvider>
  </React.StrictMode>,
);
