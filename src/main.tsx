import React from "react";
import ReactDOM from "react-dom/client";
import { AppearanceProvider } from "./Appearance";
import "@radix-ui/themes/styles.css";
import "@fontsource-variable/dm-sans";
import "./styles.css";
import "./form-v2.css";
import "./theme.css";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppearanceProvider>
      <App />
    </AppearanceProvider>
  </React.StrictMode>,
);
