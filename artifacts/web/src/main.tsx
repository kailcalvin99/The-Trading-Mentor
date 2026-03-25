import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAuth } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { configureAuth } from "@workspace/api-client-react";

const TOKEN_KEY = "ICT_TRADING_MENTOR_TOKEN";

configureAuth({
  tokenProvider: () => localStorage.getItem(TOKEN_KEY),
  credentials: "include",
});

configureAuth({ credentials: "include", baseUrl: import.meta.env.VITE_API_URL || "/api" });

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
