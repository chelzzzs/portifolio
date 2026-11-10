// Estado e utilitários da simulação, sem dependência do three.js: a App importa daqui
// e a cena 3D (que traz o three) é carregada sob demanda.

/** Relógio compartilhado do sistema: `scale` desacelera as órbitas no hover e pausa com algo aberto. */
export const sim = { time: 0, scale: 1 };

/**
 * Relógio da abertura. Começa parado (câmera colada no buraco negro) e só anda depois
 * que o overlay com o nome sai (`started`). `done` libera a câmera para o controle normal.
 */
export const intro = { started: false, startedAt: 0, t: 0, done: false };

/**
 * Quando as animações CSS do nome (index.html) terminam, em ms desde o início da navegação.
 * Precisa acompanhar os atrasos e durações de `.intro__name span`, `.intro__line` e
 * `.intro__role` (o último termina em 0,95 s + 0,8 s).
 */
export const TITLE_SETTLED_AT = 1800;

/** Duração total da coreografia da cena, em segundos depois de `started`. */
export const INTRO_DURATION = 3.6;

/** Dispara a coreografia da cena. O tempo é de relógio de parede, sincronizado com a interface. */
export const startIntro = () => {
  intro.started = true;
  intro.startedAt = performance.now();
};

/** Atualiza `intro.t`; chamado a cada quadro pela cena. */
export const tickIntro = () => {
  if (!intro.started || intro.done) return;
  intro.t = (performance.now() - intro.startedAt) / 1000;
  if (intro.t >= INTRO_DURATION) {
    intro.t = INTRO_DURATION;
    intro.done = true;
  }
};

/** Pula a abertura (usuário com movimento reduzido). */
export const skipIntro = () => {
  intro.started = true;
  intro.t = INTRO_DURATION;
  intro.done = true;
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Progresso 0..1 de um trecho da abertura que começa em `delay` e dura `duration`. */
export const introProgress = (delay: number, duration: number) => clamp01((intro.t - delay) / duration);

export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeOutBack = (x: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Mistura exponencial independente de frame rate. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
