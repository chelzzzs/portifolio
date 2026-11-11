import { useEffect, useState } from "react";

const read = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio || 1,
  /** Fator da escala fluida da interface (1 até 1080p, 2 em 4K): ver font-size do html. */
  ui: parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1,
});

/** Tamanho da janela, DPR do aparelho e escala da interface, atualizados no resize. */
export function useViewport() {
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const onResize = () => setViewport(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}
