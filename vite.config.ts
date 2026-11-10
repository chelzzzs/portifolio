import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Caminhos relativos: o build funciona tanto na raiz de um domínio quanto em
  // subpasta (ex.: GitHub Pages em usuario.github.io/nome-do-repo/).
  base: "./",
  plugins: [react()],
});
