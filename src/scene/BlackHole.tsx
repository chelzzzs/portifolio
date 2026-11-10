import { useMemo } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { DoubleSide, ShaderMaterial } from "three";
import { ADDITIVE, NOISE_DEFINES, useDisposable } from "./materials";
import { diskFragment, diskVertex, haloFragment, haloVertex } from "./shaders";
import { damp, easeOutCubic, introProgress } from "./sim";

export const HORIZON = 1;
const DISK_INNER = 1.55;
const DISK_OUTER = 4.4;
const HALO_EXTENT = 3.4;

type Props = {
  hovered: boolean;
  onHover: (hovering: boolean) => void;
  onSelect: () => void;
};

/** Centro do sistema: horizonte de eventos, disco de acreção e a imagem lenteada do disco. */
export function BlackHole({ hovered, onHover, onSelect }: Props) {
  const disk = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: diskVertex,
        fragmentShader: diskFragment,
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: DISK_INNER },
          uOuter: { value: DISK_OUTER },
          uBrightness: { value: 0 },
        },
        defines: NOISE_DEFINES,
        side: DoubleSide,
        ...ADDITIVE,
      }),
    [],
  );

  const halo = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: {
          uTime: { value: 0 },
          uExtent: { value: HALO_EXTENT },
          uHorizon: { value: HORIZON },
          uBrightness: { value: 0 },
        },
        defines: NOISE_DEFINES,
        ...ADDITIVE,
      }),
    [],
  );

  useDisposable(disk, halo);

  useFrame((_, dt) => {
    disk.uniforms.uTime.value += dt;
    halo.uniforms.uTime.value += dt;
    // Abertura: o disco "acende" enquanto o overlay com o nome se dissolve.
    const ignite = easeOutCubic(introProgress(0, 1.6));
    const boost = (hovered ? 1.35 : 1) * ignite;
    disk.uniforms.uBrightness.value = damp(disk.uniforms.uBrightness.value, 1.4 * boost, 4, dt);
    halo.uniforms.uBrightness.value = damp(halo.uniforms.uBrightness.value, 1.2 * boost, 4, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(true);
  };

  return (
    <group>
      <mesh>
        <sphereGeometry args={[HORIZON, 64, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      <Billboard>
        <mesh material={halo} renderOrder={1}>
          <planeGeometry args={[HALO_EXTENT * 2, HALO_EXTENT * 2]} />
        </mesh>
      </Billboard>

      <mesh material={disk} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[DISK_INNER, DISK_OUTER, 256, 1]} />
      </mesh>

      {/* Área de clique */}
      <mesh
        onPointerOver={over}
        onPointerOut={() => onHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[2.4, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
