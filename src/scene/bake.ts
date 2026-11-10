import {
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Color,
  type WebGLRenderer,
} from "three";
import { planetBakeFragment, planetBakeVertex } from "./shaders";

export type BakeInput = {
  colors: [Color, Color, Color];
  type: number;
  seed: number;
};

/**
 * Renderiza a superfície procedural dos planetas em texturas equiretangulares (largura ×
 * largura/2), uma vez.
 *
 * Um único material (e portanto um único programa de shader) serve a todos os planetas:
 * só os uniforms mudam entre um bake e outro. O programa é compilado de forma assíncrona
 * em `compile()`, para não travar a thread principal durante a abertura.
 * Sem mipmaps de propósito: a costura em u = 0/1 (atan) não gera linha no planeta.
 */
export class PlanetBaker {
  private readonly material = new ShaderMaterial({
    vertexShader: planetBakeVertex,
    fragmentShader: planetBakeFragment,
    uniforms: {
      uColorA: { value: null },
      uColorB: { value: null },
      uColorC: { value: null },
      uType: { value: 0 },
      uSeed: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly scene = new Scene().add(new Mesh(this.geometry, this.material));
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  compile(gl: WebGLRenderer) {
    // O programa depende do destino (canvas em sRGB × render target linear): compila já
    // com um render target ativo, senão o primeiro bake recompila tudo de forma síncrona.
    // compileAsync escolhe os parâmetros do programa na hora da chamada, então dá para
    // restaurar o destino logo em seguida.
    const probe = new WebGLRenderTarget(1, 1, { depthBuffer: false });
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(probe);
    const compiled = gl.compileAsync(this.scene, this.camera);
    gl.setRenderTarget(previous);
    return compiled.finally(() => probe.dispose());
  }

  /** Cria o destino de um mapa. O conteúdo é preenchido por faixas em `bakeStrip`. */
  createTarget(width: number) {
    const target = new WebGLRenderTarget(width, width / 2, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
    });
    target.texture.wrapS = RepeatWrapping;
    return target;
  }

  /**
   * Desenha só as linhas [y0, y1) do mapa. Um mapa inteiro de uma vez ocupa a GPU por
   * dezenas de ms (bem mais em celular) e atrasa os quadros da página; por faixas, o
   * trabalho cabe entre um quadro e outro.
   */
  bakeStrip(gl: WebGLRenderer, target: WebGLRenderTarget, { colors, type, seed }: BakeInput, y0: number, y1: number) {
    const { uniforms } = this.material;
    uniforms.uColorA.value = colors[0];
    uniforms.uColorB.value = colors[1];
    uniforms.uColorC.value = colors[2];
    uniforms.uType.value = type;
    uniforms.uSeed.value = seed;

    const previous = gl.getRenderTarget();
    target.scissor.set(0, y0, target.width, y1 - y0);
    target.scissorTest = true;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    target.scissorTest = false;
    gl.setRenderTarget(previous);
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}
