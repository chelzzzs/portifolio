/**
 * Perfil de qualidade decidido uma vez, no carregamento.
 *
 * "Leve" = toque (celular/tablet), poucos núcleos ou pouca memória. Nesses aparelhos a
 * resolução das duas camadas WebGL cai e os shaders usam menos camadas de ruído.
 * Em qualquer aparelho, se o FPS cair durante o uso, a cena reduz a resolução sozinha
 * (ver PerformanceMonitor em scene/SolarSystem.tsx).
 */

type NavigatorHints = Navigator & { deviceMemory?: number };

const nav = navigator as NavigatorHints;
const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
const cores = nav.hardwareConcurrency ?? 8;
const memoryGb = nav.deviceMemory ?? 8;

export const LOW_END = coarsePointer || cores <= 4 || memoryGb <= 4;

const devicePixelRatio = window.devicePixelRatio || 1;

export const QUALITY = {
  /** Faixa de DPR da cena 3D. */
  sceneDpr: (LOW_END ? [1, 1.5] : [1, 2]) as [number, number],
  /** DPR do fundo de estrelas (shader de tela cheia, o mais caro por pixel). */
  galaxyDpr: LOW_END ? 1 : 1.5,
  galaxyLayers: LOW_END ? 3 : 4,
  /** Com DPR alto a densidade de pixels já suaviza as bordas; MSAA só custaria. */
  antialias: !LOW_END && devicePixelRatio < 2,
  /** Camadas de ruído nos shaders animados (disco e halo do buraco negro). */
  noiseOctaves: LOW_END ? 3 : 5,
  /** Resolução da textura pré-calculada de cada planeta (largura; altura = metade). */
  planetMapSize: LOW_END ? 512 : 1024,
} as const;
