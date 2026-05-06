import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { EditorWindow } from "./routes/EditorWindow";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorWindow />
  </React.StrictMode>,
);
