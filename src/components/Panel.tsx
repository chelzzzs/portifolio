import { useEffect, useRef } from "react";
import { profile, projects, type Project } from "../data/portfolio";
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
      aria-label={project ? project.name : "Sobre"}
      style={{ ["--accent" as string]: accent }}
    >
      <button className="panel__close" onClick={onClose} aria-label="Fechar">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {project ? <ProjectBody project={project} onStep={onStep} /> : <AboutBody />}
    </aside>
  );
}

function ProjectBody({ project, onStep }: { project: Project; onStep: (delta: number) => void }) {
  const index = projects.indexOf(project);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <p className="panel__eyebrow">
        <span className="panel__dot" />
        Planeta {pad(index + 1)} / {pad(projects.length)}
      </p>
      <h2 className="panel__title">{project.name}</h2>
      <p className="panel__kind">{project.kind}</p>

      {project.image && (
        <figure className="panel__media">
          <img src={project.image} alt={`Tela do projeto ${project.name}`} loading="lazy" />
        </figure>
      )}

      <p className="panel__text">{project.description}</p>

      <ul className="chips">
        {project.tags.map((tag) => (
          <li key={tag} className="chip">
            {tag}
          </li>
        ))}
      </ul>

      {(project.repo || project.demo) && (
        <div className="panel__actions">
          {project.demo && (
            <a className="button button--primary" href={project.demo} target="_blank" rel="noreferrer">
              Ver projeto ↗
            </a>
          )}
          {project.repo && (
            <a className="button" href={project.repo} target="_blank" rel="noreferrer">
              Código ↗
            </a>
          )}
        </div>
      )}

      <nav className="panel__pager">
        <button onClick={() => onStep(-1)}>← Anterior</button>
        <button onClick={() => onStep(1)}>Próximo →</button>
      </nav>
    </>
  );
}

function AboutBody() {
  return (
    <>
      <p className="panel__eyebrow">
        <span className="panel__dot" />
        Centro do sistema
      </p>
      <h2 className="panel__title">{profile.name}</h2>
      <p className="panel__kind">{profile.role}</p>

      <dl className="facts">
        {profile.facts.map((fact) => (
          <div key={fact.label} className="facts__item">
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {profile.bio.map((paragraph) => (
        <p key={paragraph} className="panel__text">
          {paragraph}
        </p>
      ))}

      <div className="stack">
        {profile.stack.map((group) => (
          <div key={group.group} className="stack__group">
            <p className="stack__label">{group.group}</p>
            <ul className="chips">
              {group.items.map((item) => (
                <li key={item} className="chip">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel__actions">
        <a className="button button--primary" href={`mailto:${profile.email}`}>
          Falar comigo
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
