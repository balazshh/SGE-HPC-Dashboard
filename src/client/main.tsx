import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppRouter } from "./app/router";
import "./app/app.css";
import { createAppTrpcClient, TRPCProvider } from "./lib/trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const trpcClient = createAppTrpcClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <AppRouter />
      </TRPCProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
