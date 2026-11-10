import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import Galaxy from "./components/Galaxy";
import { Hud } from "./components/Hud";
import { Panel } from "./components/Panel";
import { SceneBoundary } from "./components/SceneBoundary";
import { projects } from "./data/portfolio";
import { LOW_END, QUALITY } from "./quality";
import type { Selection } from "./scene/SolarSystem";
import { INTRO_DURATION, skipIntro, startIntro } from "./scene/sim";

// A cena (three.js, R3F, drei) é a maior parte do JS: vai num chunk separado e baixa
// enquanto o overlay da abertura, que é HTML/CSS puro, já está na tela.
const SolarSystem = lazy(() => import("./scene/SolarSystem"));

type Phase = "title" | "reveal" | "ready";

/** Tempo mínimo de tela do nome, contado desde o início do carregamento (ms). */
const REVEAL_AT = 1700;
/** Quanto depois da revelação a interface aparece: perto do fim da coreografia (ms). */
const READY_AFTER = (INTRO_DURATION - 0.6) * 1000;
/** Espera máxima pela cena antes de revelar mesmo assim (ms, contados da montagem da App). */
const REVEAL_TIMEOUT = 9000;
/** Duração do fade do overlay (ms), igual à transição em index.html. */
const OVERLAY_FADE = 1100;
/** Espera máxima pelo aquecimento da galáxia (ms): sem WebGL2 ela nunca avisa. */
const PRIME_TIMEOUT = 1500;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const introOverlay = () => document.getElementById("intro");

export function App() {
  const [selection, setSelection] = useState<Selection>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (reducedMotion() ? "ready" : "title"));
  const [sceneReady, setSceneReady] = useState(false);
  const [galaxyPrimed, setGalaxyPrimed] = useState(false);
  // Se o FPS cair, o fundo de estrelas também reduz a qualidade.
  const [degraded, setDegraded] = useState(LOW_END);

  // Movimento reduzido: sem abertura.
  useEffect(() => {
    if (phase !== "ready") return;
    skipIntro();
    introOverlay()?.remove();
    // Só no primeiro render; as transições seguintes são tratadas abaixo.
  }, []);

  // Rede de segurança: se a cena não ficar pronta (WebGL indisponível, rede lenta demais),
  // a abertura segue mesmo assim em vez de prender a página no nome.
  useEffect(() => {
    if (phase !== "title") return;
    const timer = window.setTimeout(() => setSceneReady(true), REVEAL_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Com a cena pronta, a galáxia é montada escondida (hold) para compilar sob o overlay.
  useEffect(() => {
    if (phase !== "title" || !sceneReady || galaxyPrimed) return;
    const timer = window.setTimeout(() => setGalaxyPrimed(true), PRIME_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [phase, sceneReady, galaxyPrimed]);

  // Revela quando a cena e a galáxia já desenharam uma vez (nenhuma compilação sobra para
  // o meio da transição) E o nome já ficou o tempo mínimo na tela.
  useEffect(() => {
    if (phase !== "title" || !sceneReady || !galaxyPrimed) return;
    const wait = Math.max(0, REVEAL_AT - performance.now());
    const timer = window.setTimeout(() => {
      startIntro();
      introOverlay()?.classList.add("is-leaving");
      setPhase("reveal");
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, sceneReady, galaxyPrimed]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const removeOverlay = window.setTimeout(() => introOverlay()?.remove(), OVERLAY_FADE);
    const ready = window.setTimeout(() => setPhase("ready"), READY_AFTER);
    return () => {
      window.clearTimeout(removeOverlay);
      window.clearTimeout(ready);
    };
  }, [phase]);

  const clearHover = useCallback(() => {
    setHovered(null);
    document.body.style.cursor = "";
  }, []);

  const select = useCallback(
    (next: Selection) => {
      setSelection(next);
      clearHover();
    },
    [clearHover],
  );

  const step = useCallback(
    (delta: number) => {
      setSelection((current) => {
        if (current?.kind !== "project") return current;
        const index = projects.findIndex((p) => p.id === current.id);
        const next = projects[(index + delta + projects.length) % projects.length];
        return { kind: "project", id: next.id };
      });
      // O planeta sob o mouse pode sumir na troca sem disparar "pointer out".
      clearHover();
    },
    [clearHover],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, step]);

  return (
    <>
      <div className="layer layer--galaxy" aria-hidden="true">
        {/* Montado escondido quando a cena fica pronta; o warp de entrada só começa na
            revelação e vira a "chegada" ao sistema. */}
        {(phase !== "title" || sceneReady) && (
          <Galaxy
            density={2.9}
            glowIntensity={0.3}
            flareIntensity={1.1}
            starSpeed={0}
            mouseRepulsion={false}
            clickWarp
            starColors={[]}
            hueShift={140}
            saturation={0}
            starSize={0.65}
            twinkleIntensity={0.3}
            speed={0.2}
            rotationSpeed={0}
            layers={degraded ? 3 : QUALITY.galaxyLayers}
            direction="forward"
            repulsionStrength={1.8}
            mouseInteraction
            intro
            hold={phase === "title"}
            onPrimed={() => setGalaxyPrimed(true)}
            lightMode={false}
            dpr={degraded ? 1 : QUALITY.galaxyDpr}
          />
        )}
      </div>

      <div className="layer layer--scene">
        <SceneBoundary onError={() => setSceneReady(true)}>
          <Suspense fallback={null}>
            <SolarSystem
              selection={selection}
              hovered={hovered}
              onHover={setHovered}
              onSelect={select}
              onReady={() => setSceneReady(true)}
              monitor={phase === "ready"}
              onDecline={() => setDegraded(true)}
            />
          </Suspense>
        </SceneBoundary>
      </div>

      {phase === "ready" && <Hud selection={selection} hovered={hovered} onHover={setHovered} onSelect={select} />}
      <Panel selection={selection} onClose={() => select(null)} onStep={step} />
    </>
  );
}
