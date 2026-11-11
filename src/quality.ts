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
  /** DPR máximo da cena 3D (o real ainda passa pelo orçamento de pixels abaixo). */
  sceneDpr: LOW_END ? 1.5 : 2,
  /** DPR máximo do fundo de estrelas (shader de tela cheia, o mais caro por pixel). */
  galaxyDpr: LOW_END ? 1 : 1.5,
  /**
   * Orçamento de pixels por camada WebGL. O custo dos shaders cresce com a área: sem teto,
   * uma tela 4K renderizaria 4× mais pixels que uma 1080p (e o fundo, a 1,5×, 9× mais).
   * Cena: ~2560×1600. Fundo: pouco mais que 1080p; as estrelas são suaves e escalam bem.
   */
  scenePixels: LOW_END ? 2_000_000 : 4_200_000,
  galaxyPixels: LOW_END ? 1_200_000 : 2_600_000,
  galaxyLayers: LOW_END ? 3 : 4,
  /** Com DPR alto a densidade de pixels já suaviza as bordas; MSAA só custaria. */
  antialias: !LOW_END && devicePixelRatio < 2,
  /** Camadas de ruído nos shaders animados (disco e halo do buraco negro). */
  noiseOctaves: LOW_END ? 3 : 5,
  /** Resolução da textura pré-calculada de cada planeta (largura; altura = metade). */
  planetMapSize: LOW_END ? 512 : 1024,
} as const;

/** Maior DPR, até `max`, que mantém largura × altura × dpr² dentro do orçamento de pixels. */
export const budgetDpr = (width: number, height: number, max: number, pixels: number) =>
  Math.max(0.5, Math.min(max, Math.sqrt(pixels / Math.max(1, width * height))));
