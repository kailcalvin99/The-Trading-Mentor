import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureAuth } from "@workspace/api-client-react";

const TOKEN_KEY = "ICT_TRADING_MENTOR_TOKEN";

configureAuth({
  tokenProvider: () => localStorage.getItem(TOKEN_KEY),
  credentials: "include",
});

createRoot(document.getElementById("root")!).render(<App />);
