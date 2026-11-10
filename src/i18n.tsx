import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";

export const LANGS: Lang[] = ["pt", "en"];

/** Texto que muda com o idioma. Uma string simples vale para os dois. */
export type Text = string | Record<Lang, string>;

export const tr = (text: Text, lang: Lang) => (typeof text === "string" ? text : text[lang]);

/** Chave usada também pelo script inline do index.html: manter as duas iguais. */
const STORAGE_KEY = "lang";

/**
 * O idioma é decidido antes do React, num script inline do index.html (parâmetro ?lang,
 * escolha salva ou idioma do navegador), para a abertura já aparecer no idioma certo.
 * Aqui só lemos o resultado em <html lang>.
 */
const initialLang = (): Lang => (document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "pt");

const META: Record<Lang, { htmlLang: string; title: string; description: string }> = {
  pt: {
    htmlLang: "pt-BR",
    title: "Michel Zulszeski · Desenvolvedor Full Stack",
    description: "Portfólio de Michel Zulszeski, desenvolvedor full stack. Cada planeta deste sistema é um projeto.",
  },
  en: {
    htmlLang: "en",
    title: "Michel Zulszeski · Full Stack Developer",
    description: "Portfolio of Michel Zulszeski, full stack developer. Every planet in this system is a project.",
  },
};

const applyDocument = (lang: Lang) => {
  const meta = META[lang];
  document.documentElement.lang = meta.htmlLang;
  document.title = meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
};

type LangState = { lang: Lang; setLang: (lang: Lang) => void; t: (text: Text) => string };

const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    applyDocument(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem armazenamento (navegação privada restrita): vale só para esta visita.
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (text: Text) => tr(text, lang) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang precisa estar dentro de <LangProvider>");
  return value;
}

/** Textos da interface (os do conteúdo ficam em data/portfolio.ts). */
export const UI = {
  backToOverview: { pt: "Voltar à visão geral", en: "Back to overview" },
  about: { pt: "Sobre", en: "About" },
  contact: { pt: "Contato", en: "Contact" },
  language: { pt: "Idioma", en: "Language" },
  hintPointer: { pt: "Clique num planeta para ver o projeto", en: "Click a planet to see the project" },
  hintTouch: { pt: "Toque num planeta", en: "Tap a planet" },
  projects: { pt: "Projetos", en: "Projects" },
  close: { pt: "Fechar", en: "Close" },
  planet: { pt: "Planeta", en: "Planet" },
  screenshotOf: { pt: "Tela do projeto", en: "Screenshot of" },
  viewProject: { pt: "Ver projeto ↗", en: "View project ↗" },
  code: { pt: "Código ↗", en: "Code ↗" },
  previous: { pt: "← Anterior", en: "← Previous" },
  next: { pt: "Próximo →", en: "Next →" },
  center: { pt: "Centro do sistema", en: "Center of the system" },
  getInTouch: { pt: "Falar comigo", en: "Get in touch" },
  copy: { pt: "Copiar", en: "Copy" },
  copied: { pt: "Copiado ✓", en: "Copied ✓" },
  writeEmail: { pt: "Escrever ↗", en: "Write ↗" },
} satisfies Record<string, Text>;
