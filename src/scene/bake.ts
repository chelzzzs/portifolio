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

type BakeInput = {
  colors: [Color, Color, Color];
  type: number;
  seed: number;
  /** Largura do mapa; a altura é metade (equiretangular). */
  width: number;
};

/**
 * Renderiza a superfície procedural de um planeta numa textura equiretangular, uma vez.
 * Sem mipmaps de propósito: a costura em u = 0/1 (atan) não gera linha no planeta.
 */
export function bakePlanetMap(gl: WebGLRenderer, { colors, type, seed, width }: BakeInput) {
  const target = new WebGLRenderTarget(width, width / 2, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
  });
  target.texture.wrapS = RepeatWrapping;

  const material = new ShaderMaterial({
    vertexShader: planetBakeVertex,
    fragmentShader: planetBakeFragment,
    uniforms: {
      uColorA: { value: colors[0] },
      uColorB: { value: colors[1] },
      uColorC: { value: colors[2] },
      uType: { value: type },
      uSeed: { value: seed },
    },
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene, camera);
  gl.setRenderTarget(previous);

  material.dispose();
  geometry.dispose();
  return target;
}
