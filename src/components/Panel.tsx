import { useEffect, useRef } from "react";
import { profile, projects, type Project } from "../data/portfolio";
import { UI, useLang } from "../i18n";
import type { Selection } from "../scene/SolarSystem";

type Props = {
  selection: Selection;
  onClose: () => void;
  onStep: (delta: number) => void;
};

export function Panel({ selection, onClose, onStep }: Props) {
  if (!selection) return null;
  return <PanelView selection={selection} onClose={onClose} onStep={onStep} />;
}

/** Montado enquanto houver algo aberto; trocar de projeto não remonta, só troca o conteúdo. */
function PanelView({ selection, onClose, onStep }: Props & { selection: NonNullable<Selection> }) {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const project = selection.kind === "project" ? projects.find((p) => p.id === selection.id) : undefined;
  const key = project?.id ?? "about";
  const accent = project?.planet.atmosphere ?? "#ffb36b";

  // Ao abrir, guarda quem tinha o foco; ao fechar, devolve o foco para lá.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // A cada conteúdo novo, o foco vai para o painel (leitores de tela anunciam o título).
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [key]);

  return (
    <aside
      key={key}
      ref={ref}
      tabIndex={-1}
      className="panel"
      data-no-warp
      role="dialog"
      aria-label={project ? t(project.name) : t(UI.about)}
      style={{ ["--accent" as string]: accent }}
    >
      <button className="panel__close" onClick={onClose} aria-label={t(UI.close)}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {project ? <ProjectBody project={project} onStep={onStep} /> : <AboutBody />}
    </aside>
  );
}

function ProjectBody({ project, onStep }: { project: Project; onStep: (delta: number) => void }) {
  const { t } = useLang();
  const index = projects.indexOf(project);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <p className="panel__eyebrow">
        <span className="panel__dot" />
        {t(UI.planet)} {pad(index + 1)} / {pad(projects.length)}
      </p>
      <h2 className="panel__title">{t(project.name)}</h2>
      <p className="panel__kind">{t(project.kind)}</p>

      {project.image && (
        <figure className="panel__media">
          <img src={project.image} alt={`${t(UI.screenshotOf)} ${t(project.name)}`} loading="lazy" />
        </figure>
      )}

      <p className="panel__text">{t(project.description)}</p>

      <ul className="chips">
        {project.tags.map((tag, i) => (
          <li key={i} className="chip">
            {t(tag)}
          </li>
        ))}
      </ul>

      {(project.repo || project.demo) && (
        <div className="panel__actions">
          {project.demo && (
            <a className="button button--primary" href={project.demo} target="_blank" rel="noreferrer">
              {t(UI.viewProject)}
            </a>
          )}
          {project.repo && (
            <a className="button" href={project.repo} target="_blank" rel="noreferrer">
              {t(UI.code)}
            </a>
          )}
        </div>
      )}

      <nav className="panel__pager">
        <button onClick={() => onStep(-1)}>{t(UI.previous)}</button>
        <button onClick={() => onStep(1)}>{t(UI.next)}</button>
      </nav>
    </>
  );
}

function AboutBody() {
  const { t } = useLang();
  return (
    <>
      <p className="panel__eyebrow">
        <span className="panel__dot" />
        {t(UI.center)}
      </p>
      <h2 className="panel__title">{profile.name}</h2>
      <p className="panel__kind">{t(profile.role)}</p>

      <dl className="facts">
        {profile.facts.map((fact, i) => (
          <div key={i} className="facts__item">
            <dt>{t(fact.label)}</dt>
            <dd>{t(fact.value)}</dd>
          </div>
        ))}
      </dl>

      {profile.bio.map((paragraph, i) => (
        <p key={i} className="panel__text">
          {t(paragraph)}
        </p>
      ))}

      <div className="stack">
        {profile.stack.map((group, i) => (
          <div key={i} className="stack__group">
            <p className="stack__label">{t(group.group)}</p>
            <ul className="chips">
              {group.items.map((item, j) => (
                <li key={j} className="chip">
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel__actions">
        <a className="button button--primary" href={`mailto:${profile.email}`}>
          {t(UI.getInTouch)}
        </a>
        {profile.links.map((link) => (
          <a key={link.href} className="button" href={link.href} target="_blank" rel="noreferrer">
            {link.label} ↗
          </a>
        ))}
      </div>
    </>
  );
}
