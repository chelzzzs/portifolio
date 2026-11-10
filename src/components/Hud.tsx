import { useEffect, useState, type CSSProperties } from "react";
import { profile, projects } from "../data/portfolio";
import { LANGS, UI, useLang } from "../i18n";
import type { Selection } from "../scene/SolarSystem";

type Props = {
  selection: Selection;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onSelect: (selection: Selection) => void;
};

/** Mesmas condições em que o CSS esconde o dock com um painel aberto (ver index.css). */
const DOCK_HIDES_QUERY = "(max-width: 767px), (max-aspect-ratio: 4/5), (max-height: 520px) and (min-width: 768px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function Hud({ selection, hovered, onHover, onSelect }: Props) {
  const { lang, setLang, t } = useLang();
  const selectedId = selection?.kind === "project" ? selection.id : null;
  const dockHides = useMediaQuery(DOCK_HIDES_QUERY);

  return (
    <div className={`hud${selection ? " hud--focused" : ""}`}>
      <header className="hud__top">
        <button className="brand" data-no-warp onClick={() => onSelect(null)} aria-label={t(UI.backToOverview)}>
          <span className="brand__name">{profile.name}</span>
          <span className="brand__role">{t(profile.role)}</span>
          <span className="brand__stack">
            {profile.headline.map((item, i) => (
              <span key={i}>
                <span className="brand__tech">{t(item)}</span>
                {/* Espaço inquebrável antes do ponto: a quebra de linha nunca começa com "·". */}
                {i < profile.headline.length - 1 && " · "}
              </span>
            ))}
          </span>
        </button>

        <nav className="nav" data-no-warp>
          <button
            className={`nav__link${selection?.kind === "about" ? " is-active" : ""}`}
            onClick={() => onSelect({ kind: "about" })}
          >
            {t(UI.about)}
          </button>
          {profile.links.map((link) => (
            <a key={link.href} className="nav__link nav__link--secondary" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
          <a className="nav__link" href={`mailto:${profile.email}`}>
            {t(UI.contact)}
          </a>

          <div className="lang" role="group" aria-label={t(UI.language)}>
            {LANGS.map((option) => (
              <button
                key={option}
                className={`lang__option${option === lang ? " is-active" : ""}`}
                aria-pressed={option === lang}
                lang={option === "pt" ? "pt-BR" : "en"}
                onClick={() => setLang(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Onde o dock some com o painel aberto, ele também sai da navegação por teclado. */}
      <footer className="hud__bottom" inert={Boolean(selection) && dockHides}>
        <p className="hint">
          <span className="hint__dot" />
          <span className="hint__desktop">{t(UI.hintPointer)}</span>
          <span className="hint__touch">{t(UI.hintTouch)}</span>
        </p>

        <nav className="dock" aria-label={t(UI.projects)} data-no-warp>
          {projects.map((project, i) => (
            <button
              key={project.id}
              className={`dock__item${selectedId === project.id ? " is-active" : ""}${hovered === project.id ? " is-hover" : ""}`}
              onMouseEnter={() => onHover(project.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(project.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect({ kind: "project", id: project.id })}
              style={{ "--i": i } as CSSProperties}
            >
              <span className="dock__dot" style={{ background: project.planet.atmosphere }} />
              <span className="dock__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="dock__name">{t(project.name)}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}
