import { useEffect } from "react";
import { CustomBlending, OneFactor, type Material } from "three";
import { QUALITY } from "../quality";

/**
 * Blending aditivo pré-multiplicado (ONE, ONE). Os shaders escrevem alpha = canal mais forte,
 * então o brilho soma luz sobre as estrelas do canvas de trás sem virar um retângulo opaco.
 */
export const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneFactor,
} as const;

/** Defines comuns aos shaders com ruído animado (ver NOISE em shaders.ts). */
export const NOISE_DEFINES = { FBM_OCTAVES: QUALITY.noiseOctaves };

/**
 * Libera da GPU os materiais criados com useMemo quando eles são trocados ou o
 * componente desmonta (o R3F não faz isso para materiais passados por prop).
 */
export function useDisposable(...items: (Material | { dispose: () => void } | null | undefined)[]) {
  useEffect(
    () => () => {
      for (const item of items) item?.dispose();
    },
    // Cada chamada passa sempre a mesma quantidade de itens, então o array serve de deps.
    items,
  );
}
