import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LangProvider } from "./i18n";
import "./index.css";

// Sem StrictMode: o Galaxy chama loseContext() no cleanup, e o mount duplo do StrictMode
// em dev deixaria o segundo mount com um contexto WebGL perdido (fundo vazio).
createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <App />
  </LangProvider>,
);
