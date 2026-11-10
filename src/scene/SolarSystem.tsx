import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, PerformanceMonitor } from "@react-three/drei";
import { QUALITY } from "../quality";
import { MathUtils, Vector3, type Object3D, type PerspectiveCamera } from "three";
import type { Line2, LineSegments2 } from "three-stdlib";
import { projects } from "../data/portfolio";
import { BlackHole } from "./BlackHole";
import { Planet } from "./Planet";
import { clamp01, damp, easeInOutCubic, intro, introProgress, sim, tickIntro } from "./sim";

export type Selection = { kind: "project"; id: string } | { kind: "about" } | null;

type Bodies = MutableRefObject<Map<string, Object3D>>;

type Props = {
  selection: Selection;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onSelect: (selection: Selection) => void;
};

const MOBILE_WIDTH = 768;

type Size = { width: number; height: number };

/** Tela em pé (celular, tablet na vertical): o sistema é mostrado "deitado de lado". */
const isPortrait = ({ width, height }: Size) => width / height <= 0.8;

/**
 * Layout compacto: o painel vira uma gaveta embaixo e o corpo em foco sobe.
 * Precisa bater com a media query `(max-width: 767px), (max-aspect-ratio: 4/5)` do CSS
 * (`max-aspect-ratio` é inclusivo, por isso `<=` em isPortrait).
 */
const isCompact = (size: Size) => size.width < MOBILE_WIDTH || isPortrait(size);

/**
 * No layout compacto as órbitas ficam mais juntas para o sistema caber na largura.
 * Os planetas giram sincronizados a ângulos iguais, então nunca se encostam.
 */
const compactOrbit = (orbit: number) => 6.2 + (orbit - 7.5) * 0.52;

/** Raio que precisa caber na largura da tela: última órbita compacta + planeta + folga. */
const COMPACT_EXTENT = 15.6;
/** Inclinação da câmera na visão geral compacta (rad): mais de cima que no desktop. */
const COMPACT_ELEVATION = 0.95;

type SceneProps = Props & {
  /** Chamado depois dos primeiros quadros (shaders compilados, texturas prontas). */
  onReady: () => void;
  /** Chamado quando o FPS cai e a cena reduz a qualidade. */
  onDecline: () => void;
};

/** Maior intervalo de quadro considerado (s): evita saltos ao voltar de outra aba. */
const MAX_DT = 0.1;

export default function SolarSystem({ onReady, onDecline, ...props }: SceneProps) {
  const [dpr, setDpr] = useState<number | [number, number]>(QUALITY.sceneDpr);
  return (
    <Canvas
      className="scene"
      flat
      dpr={dpr}
      gl={{ alpha: true, antialias: QUALITY.antialias, powerPreference: "high-performance" }}
      camera={{ position: [0, 42, 98], fov: 45, near: 0.1, far: 600 }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          onDecline();
        }}
      />
      <System {...props} onReady={onReady} />
    </Canvas>
  );
}

function System({ selection, hovered, onHover, onSelect, onReady }: Props & { onReady: () => void }) {
  const size = useThree((s) => s.size);
  const compact = isCompact(size);
  const scale = compact ? 1.15 : 1;
  // No toque, a área de clique de cada planeta precisa ser bem maior que o desenho.
  const minHit = compact ? 2.0 : 1.1;
  const bodies = useRef(new Map<string, Object3D>());
  const frames = useRef(0);
  const register = useCallback((id: string, object: Object3D | null) => {
    if (object) bodies.current.set(id, object);
    else bodies.current.delete(id);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT);
    if (++frames.current === 3) onReady();
    tickIntro();
    const target = selection ? 0 : hovered ? 0.15 : 1;
    sim.scale = damp(sim.scale, target, 3, dt);
    sim.time += dt * sim.scale;
  });

  // Durante a abertura nada é selecionável: a interface ainda não existe.
  const select = (next: Selection) => {
    if (intro.done) onSelect(next);
  };

  const selectedId = selection?.kind === "project" ? selection.id : null;

  return (
    <>
      <CameraRig selection={selection} bodies={bodies} scale={scale} />

      <BlackHole
        hovered={hovered === "about"}
        onHover={(on) => {
          onHover(on ? "about" : null);
          document.body.style.cursor = on ? "pointer" : "";
        }}
        onSelect={() => select({ kind: "about" })}
      />

      {projects.map((project, index) => {
        const active = hovered === project.id;
        const orbit = compact ? compactOrbit(project.planet.orbit) : project.planet.orbit;
        return (
          <group key={project.id}>
            <Orbit radius={orbit} index={index} active={active} dimmed={Boolean(selection)} />
            <Planet
              project={project}
              orbit={orbit}
              index={index}
              total={projects.length}
              scale={scale}
              minHit={minHit}
              hovered={hovered === project.id}
              selected={selectedId === project.id}
              dimmed={Boolean(selection) && selectedId !== project.id}
              onHover={(id) => {
                onHover(id);
                document.body.style.cursor = id ? "pointer" : "";
              }}
              onSelect={(id) => select({ kind: "project", id })}
              register={register}
            />
          </group>
        );
      })}
    </>
  );
}

const ORBIT_SEGMENTS = 192;

type OrbitProps = { radius: number; index: number; active: boolean; dimmed: boolean };

function Orbit({ radius, index, active, dimmed }: OrbitProps) {
  const ref = useRef<Line2 | LineSegments2>(null);
  const points = useMemo(
    () =>
      Array.from({ length: ORBIT_SEGMENTS + 1 }, (_, i) => {
        // Começa atrás do buraco negro e se desenha no sentido das órbitas.
        const a = (i / ORBIT_SEGMENTS) * Math.PI * 2 - Math.PI / 2;
        return new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }),
    [radius],
  );

  // Na abertura, cada órbita se desenha em sequência (do centro para fora).
  useFrame(() => {
    const line = ref.current;
    if (!line) return;
    const drawn = easeInOutCubic(introProgress(0.5 + index * 0.16, 1.3));
    line.geometry.instanceCount = Math.ceil(drawn * ORBIT_SEGMENTS);
  });

  const opacity = dimmed ? 0.04 : active ? 0.3 : 0.11;
  return (
    <Line
      ref={ref}
      points={points}
      color="#ffffff"
      lineWidth={active ? 1.4 : 1}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}

/** Ponto de partida da abertura: colado no buraco negro, de lado e quase no plano do disco. */
const INTRO_FROM = { radius: 7.5, elevation: 0.1, yaw: -1.15 };
const INTRO_CAMERA_SECONDS = 3.4;

/**
 * Câmera guiada: visão geral com parallax leve do mouse; ao selecionar um planeta,
 * voa até ele deixando espaço para o painel (à direita no desktop, embaixo no celular).
 */
function CameraRig({ selection, bodies, scale }: { selection: Selection; bodies: Bodies; scale: number }) {
  const { camera, size, pointer } = useThree();
  const look = useRef(new Vector3());
  const v = useMemo(
    () => ({
      pos: new Vector3(),
      target: new Vector3(),
      focus: new Vector3(),
      dir: new Vector3(),
      out: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  );

  /**
   * Enquadra uma esfera de raio `r` em `v.focus`, vista da direção `v.dir`,
   * centralizada na área que o painel deixa livre.
   */
  const frame = (r: number) => {
    const { width, height } = size;
    const aspect = width / height;
    const tanHalf = Math.tan(MathUtils.degToRad((camera as PerspectiveCamera).fov / 2));
    const gutter = MathUtils.clamp(width * 0.03, 16, 36);

    // Área realmente livre, medida no DOM: abaixo do cabeçalho e fora do painel.
    // (O canvas ocupa a tela toda, então coordenadas da janela = coordenadas do canvas.)
    const headerBottom = document.querySelector(".hud__top")?.getBoundingClientRect().bottom ?? 0;
    const panelRect = document.querySelector(".panel")?.getBoundingClientRect();

    let dist: number;
    let ndcX = 0;
    let ndcY = 0;
    if (isCompact(size)) {
      // Gaveta embaixo: o corpo fica no meio do espaço entre o cabeçalho e a gaveta.
      const top = headerBottom + 8;
      const bottom = (panelRect ? panelRect.top : height * 0.48) - 8;
      const freeH = Math.max(bottom - top, height * 0.2);
      const centerPx = top + freeH / 2;
      ndcY = 1 - (2 * centerPx) / height;
      const radiusPx = Math.min(freeH * 0.4, width * 0.32);
      dist = (r * height) / (2 * tanHalf * radiusPx);
    } else {
      // Painel à direita: o corpo fica no centro da faixa livre da esquerda.
      const panelLeft = panelRect ? panelRect.left : width - (Math.min(400, width - 2 * gutter) + 2 * gutter);
      const freeW = panelLeft - gutter;
      ndcX = (freeW / 2 - width / 2) / (width / 2);
      // Na vertical, o espaço vai do fim do cabeçalho até a borda de baixo.
      const top = headerBottom + 8;
      const freeH = Math.max(height - gutter - top, height * 0.4);
      ndcY = 1 - (2 * (top + freeH / 2)) / height;
      const radiusPx = Math.min(freeW * 0.3, freeH * 0.3);
      dist = (r * height) / (2 * tanHalf * radiusPx);
    }

    v.pos.copy(v.focus).addScaledVector(v.dir, dist);
    v.forward.subVectors(v.focus, v.pos).normalize();
    v.right.crossVectors(v.forward, v.up).normalize();
    v.target
      .copy(v.focus)
      .addScaledVector(v.right, -ndcX * tanHalf * aspect * dist)
      .addScaledVector(v.up, -ndcY * tanHalf * dist);
  };

  /** Visão geral do sistema (sem parallax), em `v.pos` / `v.target`. */
  const overview = () => {
    if (isCompact(size)) {
      // Tela em pé: câmera mais alta (elipse mais redonda) e enquadrada pela largura,
      // já que as órbitas compactas cabem de lado a lado.
      const tanHalf = Math.tan(MathUtils.degToRad((camera as PerspectiveCamera).fov / 2));
      const aspect = Math.min(size.width / size.height, 1);
      const dist = COMPACT_EXTENT / (tanHalf * aspect);
      v.pos.set(0, Math.sin(COMPACT_ELEVATION) * dist, Math.cos(COMPACT_ELEVATION) * dist);
      v.target.set(0, 0, 0);
      return;
    }
    const fit = MathUtils.clamp(1.75 / (size.width / size.height), 1, 2.1);
    const dist = 37 * fit;
    v.pos.set(0, dist * 0.44, dist);
    v.target.set(0, -1.2, 0);
  };

  useFrame((_, dt) => {
    const { pos, target } = v;

    // Abertura: recua de perto do horizonte de eventos até a visão geral, girando em volta.
    if (!intro.done && !selection) {
      overview();
      const p = easeInOutCubic(clamp01(intro.t / INTRO_CAMERA_SECONDS));
      const endRadius = pos.length();
      const endElevation = Math.asin(pos.y / endRadius);
      const r = MathUtils.lerp(INTRO_FROM.radius, endRadius, p);
      const elevation = MathUtils.lerp(INTRO_FROM.elevation, endElevation, p);
      const yaw = MathUtils.lerp(INTRO_FROM.yaw, 0, p);
      camera.position.set(
        r * Math.cos(elevation) * Math.sin(yaw),
        r * Math.sin(elevation),
        r * Math.cos(elevation) * Math.cos(yaw),
      );
      look.current.set(0, 0, 0).lerp(target, p);
      camera.lookAt(look.current);
      return;
    }

    const project = selection?.kind === "project" ? projects.find((p) => p.id === selection.id) : undefined;
    const body = project ? bodies.current.get(project.id) : undefined;

    if (project && body) {
      body.getWorldPosition(v.focus);
      v.out.set(v.focus.x, 0, v.focus.z).normalize();
      // De lado e um pouco para dentro da órbita: pega o terminador dia/noite.
      v.dir.set(-v.out.z, 0, v.out.x).multiplyScalar(0.86).addScaledVector(v.out, -0.5);
      v.dir.y = 0.22;
      v.dir.normalize();
      frame(project.planet.size * scale * (project.planet.rings ? 2.1 : 1.15));
    } else if (selection?.kind === "about") {
      v.focus.set(0, 0, 0);
      v.dir.set(-0.12, 0.2, 1).normalize();
      frame(3.6);
    } else {
      overview();
      pos.x += pointer.x * 2.2;
      pos.y += pointer.y * 1.4;
    }

    const k = 1 - Math.exp(-Math.min(dt, MAX_DT) * 2.2);
    camera.position.lerp(pos, k);
    look.current.lerp(target, k);
    camera.lookAt(look.current);
  });

  return null;
}
