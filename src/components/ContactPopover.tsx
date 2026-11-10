import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { profile } from "../data/portfolio";
import { UI, useLang } from "../i18n";

/**
 * "Contato" no topo: abre um popover com o e-mail, para copiar ou escrever direto.
 * O popover vai num portal no <body>, ancorado ao botão: dentro do HUD ele ficaria
 * por baixo do painel lateral (outro contexto de empilhamento).
 */
export function ContactPopover() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<CSSProperties>({});
  const id = useId();

  // Posição: logo abaixo do botão, alinhado à direita dele. Recalcula se a janela mudar.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({ top: rect.bottom + 10, right: Math.max(12, window.innerWidth - rect.right) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Fecha ao clicar fora ou com Esc (devolvendo o foco ao botão).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Esc fecha só o popover, não o painel aberto atrás (a App escuta no window).
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
    } catch {
      // Sem acesso à área de transferência: seleciona o e-mail para o Ctrl+C manual.
      const node = emailRef.current;
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className="contact" ref={rootRef}>
      <button
        ref={triggerRef}
        className={`nav__link${open ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {t(UI.contact)}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={id}
            className="contact__popover"
            role="dialog"
            aria-label={t(UI.contact)}
            data-no-warp
            style={anchor}
          >
            <p className="contact__label">E-mail</p>
            <span ref={emailRef} className="contact__email">
              {profile.email}
            </span>
            <div className="contact__actions">
              <button className="button button--primary" onClick={copy} aria-live="polite">
                {copied ? t(UI.copied) : t(UI.copy)}
              </button>
              <a className="button" href={`mailto:${profile.email}`}>
                {t(UI.writeEmail)}
              </a>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
