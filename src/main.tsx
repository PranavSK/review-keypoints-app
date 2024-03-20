import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Dashboard } from "./components/dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
);

