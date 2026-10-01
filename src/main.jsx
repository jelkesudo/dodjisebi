import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "./styles/responsive-scenes.css";
import { ToastProvider } from "./components/ui/Feedback/Feedback";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider><App /></ToastProvider>
  </React.StrictMode>,
);
