import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BackSide, Color, DoubleSide, ShaderMaterial, type Group, type Mesh, type Object3D, type Texture } from "three";
import type { PlanetKind, Project } from "../data/portfolio";
import { ADDITIVE, useDisposable } from "./materials";
import {
  atmosphereFragment,
  atmosphereVertex,
  planetFragment,
  planetVertex,
  ringFragment,
  ringVertex,
} from "./shaders";
import { damp, easeOutBack, introProgress, sim } from "./sim";

export const KIND_INDEX: Record<PlanetKind, number> = { terran: 0, gas: 1, lava: 2, ice: 3, desert: 4 };

/** Raios do anel em unidades do raio do planeta. */
const RING_INNER = 1.45;
const RING_OUTER = 2.1;

/** Velocidade angular comum a todas as órbitas (rad/s em escala 1). */
const ORBIT_SPEED = 0.05;

type Props = {
  project: Project;
  /** Superfície pré-calculada (ver bake.ts). Quem cria a textura é quem a descarta. */
  map: Texture;
  index: number;
  total: number;
  /** Raio da órbita em uso (comprimido no layout compacto). */
  orbit: number;
  /** Multiplicador de tamanho. */
  scale: number;
  /** Raio mínimo da área de clique (maior no toque). */
  minHit: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  register: (id: string, object: Object3D | null) => void;
};

export function Planet({ project, map, index, total, orbit, scale, minHit, hovered, selected, dimmed, onHover, onSelect, register }: Props) {
  const { planet } = project;
  const size = planet.size * scale;
  const orbitRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const popRef = useRef<Group>(null);
  const presence = useRef(1);

  const surface = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uMap: { value: map },
          uColorC: { value: new Color(planet.colors[2]) },
          uAtmo: { value: new Color(planet.atmosphere) },
          uType: { value: KIND_INDEX[planet.type] },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uDim: { value: 1 },
        },
      }),
    [map, planet],
  );

  const atmosphere = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uAtmo: { value: new Color(planet.atmosphere) },
          uStrength: { value: 0.58 },
        },
        side: BackSide,
        ...ADDITIVE,
      }),
    [planet],
  );

  const rings = useMemo(
    () =>
      planet.rings
        ? new ShaderMaterial({
            vertexShader: ringVertex,
            fragmentShader: ringFragment,
            // Raios em unidades do planeta: a malha é escalada por `size`, então o
            // material não depende do tamanho e não é recriado ao mudar de layout.
            uniforms: {
              uColorA: { value: new Color(planet.rings[0]) },
              uColorB: { value: new Color(planet.rings[1]) },
              uInner: { value: RING_INNER },
              uOuter: { value: RING_OUTER },
              uSeed: { value: index * 3.1 },
              uDim: { value: 1 },
            },
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
          })
        : null,
    [planet, index],
  );

  useDisposable(surface, atmosphere, rings);

  useEffect(() => {
    register(project.id, orbitRef.current);
    return () => register(project.id, null);
  }, [project.id, register]);

  useFrame((_, dt) => {
    const group = orbitRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;
    // Órbitas sincronizadas: todos giram juntos, separados por ângulos iguais, então nunca se cruzam.
    const angle = (index / total) * Math.PI * 2 + sim.time * ORBIT_SPEED;
    group.position.set(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit);
    body.rotation.y += dt * 0.12;
    // Abertura: cada planeta surge logo depois que a própria órbita começa a se desenhar.
    const pop = easeOutBack(introProgress(1.1 + index * 0.16, 0.9));
    // Com outro corpo em foco, este planeta escurece e encolhe até sumir, para não
    // aparecer na frente do close. Volta ao fechar o painel.
    presence.current = damp(presence.current, dimmed ? 0 : 1, 5, dt);
    popRef.current?.scale.setScalar(Math.max(0.001, pop * presence.current));
    surface.uniforms.uTime.value += dt;
    surface.uniforms.uHover.value = damp(surface.uniforms.uHover.value, hovered ? 1 : 0, 6, dt);
    const dim = damp(surface.uniforms.uDim.value, dimmed ? 0.025 : 1, 4, dt);
    surface.uniforms.uDim.value = dim;
    if (rings) rings.uniforms.uDim.value = dim;
    const glow = hovered || selected ? 1.0 : 0.58;
    atmosphere.uniforms.uStrength.value = damp(atmosphere.uniforms.uStrength.value, glow * (dimmed ? 0.03 : 1), 5, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(project.id);
  };

  return (
    <group ref={orbitRef}>
      <group ref={popRef} rotation={[0, 0, planet.tilt]} scale={0.001}>
        <mesh ref={bodyRef} material={surface}>
          <sphereGeometry args={[size, 96, 64]} />
        </mesh>
        <mesh material={atmosphere} scale={1.16}>
          <sphereGeometry args={[size, 64, 32]} />
        </mesh>
        {rings && (
          <mesh material={rings} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
            <ringGeometry args={[RING_INNER, RING_OUTER, 192, 1]} />
          </mesh>
        )}
      </group>

      {/* Área de clique maior que o planeta, para facilitar o hover. Some junto com o planeta. */}
      {!dimmed && (
        <mesh
          onPointerOver={over}
          onPointerOut={() => onHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(project.id);
          }}
        >
          <sphereGeometry args={[Math.max(size * (planet.rings ? 1.9 : 1.45), minHit), 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {hovered && !selected && (
        <Html center position={[0, size * (planet.rings ? 1.5 : 1) + 0.7, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <span className="planet-label">{project.name}</span>
        </Html>
      )}
    </group>
  );
}
