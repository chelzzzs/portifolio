import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, PerformanceMonitor } from "@react-three/drei";
import { QUALITY, budgetDpr } from "../quality";
import { useViewport } from "../useViewport";
import { Color, MathUtils, Vector3, type Camera, type Mesh, type Object3D, type Scene, type PerspectiveCamera, type WebGLRenderTarget, type WebGLRenderer } from "three";
import type { Line2, LineSegments2 } from "three-stdlib";
import { projects } from "../data/portfolio";
import { tr, type Lang } from "../i18n";
import { BlackHole } from "./BlackHole";
import { PlanetBaker, type BakeInput } from "./bake";
import { KIND_INDEX, Planet } from "./Planet";
import { TITLE_SETTLED_AT, clamp01, damp, easeInOutCubic, intro, introProgress, sim, tickIntro } from "./sim";

export type Selection = { kind: "project"; id: string } | { kind: "about" } | null;

type Bodies = MutableRefObject<Map<string, Object3D>>;

type Props = {
  lang: Lang;
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
const COMPACT_EXTENT = 16.3;
/** Inclinação da câmera na visão geral compacta (rad): mais de cima que no desktop. */
const COMPACT_ELEVATION = 0.95;

type SceneProps = Props & {
  /** Chamado depois dos primeiros quadros (shaders compilados, texturas prontas). */
  onReady: () => void;
  /** Liga o monitor de FPS. Só depois da abertura, que tem picos de trabalho esperados. */
  monitor: boolean;
  /** Chamado quando o FPS cai e a cena reduz a qualidade. */
  onDecline: () => void;
};

/**
 * Cede a vez ao navegador entre dois passos pesados, para a animação da abertura seguir fluida.
 * O timeout cobre abas em segundo plano, onde requestAnimationFrame fica parado.
 */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 100);
  });

/** Maior intervalo de quadro considerado (s): evita saltos ao voltar de outra aba. */
const MAX_DT = 0.1;

export default function SolarSystem({ onReady, monitor, onDecline, ...props }: SceneProps) {
  const viewport = useViewport();
  // Se o FPS cair durante o uso, a cena passa a renderizar no máximo a 1×.
  const [declined, setDeclined] = useState(false);
  // Resolução: a do aparelho, limitada pelo perfil e pelo orçamento de pixels (telas 4K).
  const dpr = budgetDpr(
    viewport.width,
    viewport.height,
    declined ? 1 : Math.min(viewport.dpr, QUALITY.sceneDpr),
    declined ? QUALITY.scenePixels / 2 : QUALITY.scenePixels,
  );
  // Nada é desenhado até todos os shaders estarem compilados: um quadro antes disso
  // forçaria a compilação síncrona e travaria a página (e a animação do nome) por ~1 s.
  const [warm, setWarm] = useState(false);
  return (
    <Canvas
      className="scene"
      flat
      frameloop={warm ? "always" : "never"}
      dpr={dpr}
      gl={{ alpha: true, antialias: QUALITY.antialias, powerPreference: "high-performance" }}
      camera={{ position: [0, 42, 98], fov: 45, near: 0.1, far: 600 }}
      onPointerMissed={() => props.onSelect(null)}
    >
      {monitor && (
        <PerformanceMonitor
          onDecline={() => {
            setDeclined(true);
            onDecline();
          }}
        />
      )}
      <System {...props} onWarm={() => setWarm(true)} onReady={onReady} />
    </Canvas>
  );
}

type SystemProps = Props & { onWarm: () => void; onReady: () => void };

function System({ lang, selection, hovered, onHover, onSelect, onWarm, onReady }: SystemProps) {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const maps = usePlanetMaps(gl);
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

  // Com os mapas prontos e tudo montado, compila os programas da cena aos poucos
  // (assíncrono via KHR_parallel_shader_compile) e só então libera o loop de render.
  useEffect(() => {
    if (!maps) return;
    let cancelled = false;
    compileGradually(gl, scene, camera)
      .catch((error: unknown) => console.warn("Pré-compilação de shaders falhou:", error))
      .then(() => {
        if (!cancelled) onWarm();
      });
    return () => {
      cancelled = true;
    };
    // onWarm fica fora das dependências: só alterna um estado, e a pré-compilação
    // deve rodar uma vez por conjunto de mapas.
  }, [maps, gl, scene, camera]);

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

      {maps &&
        projects.map((project, index) => {
        const active = hovered === project.id;
        const orbit = compact ? compactOrbit(project.planet.orbit) : project.planet.orbit;
        return (
          <group key={project.id}>
            <Orbit radius={orbit} index={index} active={active} dimmed={Boolean(selection)} />
            <Planet
              project={project}
              map={maps[index].texture}
              label={tr(project.name, lang)}
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

/**
 * Espera a GPU terminar o que já foi enviado, sem bloquear a thread principal (fence do
 * WebGL2 consultado a cada quadro). requestAnimationFrame sozinho não basta: ele não espera
 * a GPU, e o trabalho acumulado na fila atrasa os quadros da página inteira.
 */
async function waitForGpu(gl: WebGLRenderer) {
  const context = gl.getContext();
  if (!(context instanceof WebGL2RenderingContext)) return;
  const sync = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return;
  context.flush();
  while (context.getSyncParameter(sync, context.SYNC_STATUS) !== context.SIGNALED) {
    await yieldToBrowser();
  }
  context.deleteSync(sync);
}

/**
 * Compila os programas da cena um objeto por vez, cedendo a vez ao navegador entre eles,
 * e faz um desenho de aquecimento.
 * Mandar todos de uma vez ocupa a GPU por centenas de ms e congela até as animações CSS.
 * Programas já compilados (materiais repetidos) não custam nada na segunda passada.
 */
async function compileGradually(gl: WebGLRenderer, scene: Scene, camera: Camera) {
  const meshes: Object3D[] = [];
  scene.traverseVisible((object) => {
    if ((object as Mesh).isMesh) meshes.push(object);
  });
  for (const object of meshes) {
    await yieldToBrowser();
    await gl.compileAsync(object, camera, scene);
  }
  // O driver só termina de preparar cada programa no primeiro desenho de verdade, e os
  // planetas fora do quadro (frustum culling) só seriam desenhados no meio do voo da
  // câmera. Um desenho completo agora, ainda sob o overlay, tira esse custo da abertura.
  const culled: Object3D[] = [];
  scene.traverse((object) => {
    if (object.frustumCulled) {
      culled.push(object);
      object.frustumCulled = false;
    }
  });
  await yieldToBrowser();
  gl.render(scene, camera);
  culled.forEach((object) => (object.frustumCulled = true));
  await waitForGpu(gl);
}

/**
 * Pré-calcula as superfícies dos planetas fora do render: compila o shader de bake de forma
 * assíncrona e desenha cada mapa em faixas, esperando a GPU entre elas, sem nenhuma tarefa
 * longa na thread principal nem fila acumulada na GPU.
 */
function usePlanetMaps(gl: WebGLRenderer) {
  const [maps, setMaps] = useState<WebGLRenderTarget[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const baker = new PlanetBaker();
    const made: WebGLRenderTarget[] = [];
    (async () => {
      await baker.compile(gl);
      // O primeiro desenho com esse shader segura a GPU por algumas centenas de ms (o driver
      // termina de gerar o executável só nessa hora, mesmo após a compilação assíncrona).
      // A GPU parada congela também as animações CSS, então isso espera o nome terminar de
      // se animar: com o overlay parado, a pausa não aparece.
      if (!intro.done) await sleep(TITLE_SETTLED_AT - performance.now());
      if (cancelled) return;
      const width = QUALITY.planetMapSize;
      const rows = width / 2;
      const strip = rows / BAKE_STRIPS;
      for (const [index, { planet }] of projects.entries()) {
        const input = {
          colors: [new Color(planet.colors[0]), new Color(planet.colors[1]), new Color(planet.colors[2])] as BakeInput["colors"],
          type: KIND_INDEX[planet.type],
          seed: index * 7.31 + 1.7,
        };
        const target = baker.createTarget(width);
        made.push(target);
        for (let y = 0; y < rows; y += strip) {
          await yieldToBrowser();
          if (cancelled) return;
          baker.bakeStrip(gl, target, input, y, y + strip);
          await waitForGpu(gl);
        }
      }
      baker.dispose();
      if (!cancelled) setMaps(made);
    })();
    return () => {
      cancelled = true;
      baker.dispose();
      made.forEach((map) => map.dispose());
    };
  }, [gl]);
  return maps;
}

/** Em quantas faixas cada mapa de planeta é desenhado. */
const BAKE_STRIPS = 4;

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

  // Espessura em pixels de tela: acompanha a escala da interface e a resolução reduzida.
  const { ui } = useViewport();
  const opacity = dimmed ? 0.04 : active ? 0.3 : 0.11;
  return (
    <Line
      ref={ref}
      points={points}
      color="#ffffff"
      lineWidth={(active ? 1.4 : 1) * ui}
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
    // Distância da visão geral: a órbita mais externa (23,4) com a mesma folga nas bordas.
    const dist = 38.6 * fit;
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
