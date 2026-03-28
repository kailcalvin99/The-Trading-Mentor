import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAuth } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const TOKEN_KEY = "ICT_TRADING_MENTOR_TOKEN";

configureAuth({
  tokenProvider: () => localStorage.getItem(TOKEN_KEY),
  credentials: "include",
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
