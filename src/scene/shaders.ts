// GLSL dos corpos celestes. Ruído simplex 3D (Ashima Arts / Stefan Gustavson, MIT) + fbm.
// A luz vem do centro da cena (o disco do buraco negro), então L = normalize(-worldPos).

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

#ifndef FBM_OCTAVES
#define FBM_OCTAVES 5
#endif

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < FBM_OCTAVES; i++) {
    sum += amp * snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}
`;

/* ---------------------------------- Planeta ---------------------------------- */

// A superfície é cara (até 20 amostras de ruído por pixel), então é calculada UMA vez
// numa textura equiretangular (planetBake*) e o shader de cada quadro só lê a textura.
// Mapeamento: lon = atan(p.z, p.x), lat = asin(p.y); u = lon/2π + 0.5, v = lat/π + 0.5.
// RGB guarda o albedo com gama 1/2.2 (precisão em 8 bits nos tons escuros);
// A guarda a máscara de nuvens (terran) ou de fissuras (lava).

export const planetBakeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const planetBakeFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uType;
uniform float uSeed;
varying vec2 vUv;

${NOISE}

void main() {
  float lon = (vUv.x - 0.5) * 6.2831853;
  float lat = (vUv.y - 0.5) * 3.1415927;
  vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  vec3 q = p + vec3(uSeed);

  vec3 albedo;
  float mask = 0.0;

  if (uType < 0.5) {
    // terran: oceano, continentes e calotas; nuvens vão no alpha
    float h = fbm(q * 1.6);
    float land = smoothstep(0.03, 0.09, h);
    float detail = fbm(q * 6.0) * 0.5 + 0.5;
    vec3 ocean = mix(uColorA * 0.45, uColorA, smoothstep(-0.45, 0.05, h));
    vec3 ground = mix(uColorB, uColorC, smoothstep(0.25, 0.85, detail + h));
    albedo = mix(ocean, ground, land);
    float ice = smoothstep(0.80, 0.88, abs(p.y) + fbm(q * 3.0) * 0.08);
    albedo = mix(albedo, vec3(0.92, 0.95, 1.0), ice);
    mask = smoothstep(0.05, 0.55, fbm(q * 2.4));
  } else if (uType < 1.5) {
    // gas: faixas turbulentas
    float warp = fbm(q * vec3(1.4, 3.2, 1.4));
    float bands = sin(p.y * 13.0 + warp * 3.2) * 0.5 + 0.5;
    float fine = sin(p.y * 42.0 + warp * 7.0) * 0.5 + 0.5;
    albedo = mix(uColorA, uColorB, smoothstep(0.1, 0.9, bands));
    albedo = mix(albedo, uColorC, fine * 0.28 * smoothstep(0.3, 1.0, bands));
  } else if (uType < 2.5) {
    // lava: crosta escura; fissuras vão no alpha
    float n = fbm(q * 2.2);
    float cracks = 1.0 - abs(snoise(q * 3.2 + n * 1.5));
    albedo = mix(uColorA, uColorB, n * 0.5 + 0.5);
    mask = pow(cracks, 10.0);
  } else if (uType < 3.5) {
    // ice: tons claros com linhas de fratura
    float n = fbm(q * 2.0) * 0.5 + 0.5;
    albedo = mix(uColorA, uColorB, smoothstep(0.2, 0.8, n));
    float lines = pow(1.0 - abs(snoise(q * 4.5)), 14.0);
    albedo = mix(albedo, uColorC, lines * 0.7);
  } else {
    // desert: dunas
    float n = fbm(q * 2.5) * 0.5 + 0.5;
    float dunes = sin((p.x + p.z) * 22.0 + fbm(q * 4.0) * 5.0) * 0.5 + 0.5;
    albedo = mix(uColorA, uColorB, smoothstep(0.2, 0.85, n));
    albedo = mix(albedo, uColorC, dunes * 0.22);
  }

  gl_FragColor = vec4(pow(clamp(albedo, 0.0, 1.0), vec3(1.0 / 2.2)), mask);
}
`;

export const planetVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vObj = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const planetFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColorC;
uniform vec3 uAtmo;
uniform float uType;
uniform float uTime;
uniform float uHover;
uniform float uDim;
varying vec3 vObj;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 p = normalize(vObj);
  vec2 uv = vec2(atan(p.z, p.x) * 0.15915494 + 0.5, asin(clamp(p.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  vec4 surface = texture2D(uMap, uv);
  vec3 albedo = pow(surface.rgb, vec3(2.2));

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(-vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);

  vec3 emissive = vec3(0.0);
  float spec = 0.0;

  if (uType < 0.5) {
    // terran: nuvens derivando devagar (segunda leitura da textura, deslocada em u)
    float clouds = texture2D(uMap, vec2(uv.x + uTime * 0.0025, uv.y)).a;
    albedo = mix(albedo, vec3(1.0), clouds * 0.6);
  } else if (uType > 1.5 && uType < 2.5) {
    // lava: fissuras brilham, pulsando, mais visíveis no lado noturno
    float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + uv.x * 37.0 + uv.y * 23.0);
    emissive = uColorC * surface.a * 1.6 * pulse;
  } else if (uType > 2.5 && uType < 3.5) {
    spec = 0.35;
  }

  float diffuse = smoothstep(-0.12, 0.55, ndl) * (0.55 + 0.45 * max(ndl, 0.0));
  vec3 color = albedo * (0.025 + diffuse * 1.25);

  vec3 H = normalize(L + V);
  color += vec3(1.0, 0.85, 0.7) * pow(max(dot(N, H), 0.0), 60.0) * spec * 0.6 * step(0.0, ndl);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  color += uAtmo * fresnel * (0.05 + 0.58 * smoothstep(-0.25, 0.6, ndl));

  color += emissive * (1.0 - smoothstep(-0.2, 0.6, ndl) * 0.55);
  color *= (1.0 + uHover * 0.3) * uDim;

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

/* -------------------------------- Atmosfera -------------------------------- */

// Casca BackSide um pouco maior que o planeta: brilho máximo na borda do planeta,
// sumindo até zero na borda da casca.
export const atmosphereVertex = /* glsl */ `
varying vec3 vViewNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying vec3 vCenter;
void main() {
  vViewNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const atmosphereFragment = /* glsl */ `
uniform vec3 uAtmo;
uniform float uStrength;
varying vec3 vViewNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying vec3 vCenter;
void main() {
  float k = clamp(dot(vViewNormal, normalize(vViewPos)), 0.0, 1.0);
  float rim = pow(smoothstep(0.0, 0.5, k), 2.4);
  vec3 dir = normalize(vWorldPos - vCenter);
  float lit = smoothstep(-0.35, 0.6, dot(dir, normalize(-vCenter)));
  vec3 color = uAtmo * rim * (0.12 + lit) * uStrength;
  gl_FragColor = vec4(color, clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0));
  #include <colorspace_fragment>
}
`;

/* ---------------------------------- Anéis ---------------------------------- */

export const ringVertex = /* glsl */ `
varying float vRadius;
varying vec3 vWorldPos;
void main() {
  vRadius = length(position.xy);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ringFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uInner;
uniform float uOuter;
uniform float uSeed;
uniform float uDim;
varying float vRadius;
varying vec3 vWorldPos;

${NOISE}

void main() {
  float t = clamp((vRadius - uInner) / (uOuter - uInner), 0.0, 1.0);
  float bands = snoise(vec3(t * 14.0, uSeed, 0.0)) * 0.5 + 0.5;
  float fine = snoise(vec3(t * 36.0, uSeed + 3.0, 0.0)) * 0.5 + 0.5;
  float gap = 1.0 - (1.0 - smoothstep(0.015, 0.035, abs(t - 0.62))) * 0.9;
  float alpha = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t) * (0.2 + 0.5 * bands + 0.2 * fine) * gap;
  vec3 color = mix(uColorB, uColorA, bands);
  float light = 0.35 + 0.65 * smoothstep(0.0, 1.0, 1.0 - length(vWorldPos) / 40.0);
  gl_FragColor = vec4(color * light * uDim, alpha * 0.85 * uDim);
  #include <colorspace_fragment>
}
`;

/* ------------------------------- Buraco negro ------------------------------- */

// Disco de acreção no plano XY local (a malha é girada para ficar deitada).
export const diskVertex = /* glsl */ `
varying vec2 vLocal;
varying vec3 vWorldPos;
void main() {
  vLocal = position.xy;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const DISK_COMMON = /* glsl */ `
vec3 diskColor(float t) {
  vec3 hot = vec3(1.0, 0.94, 0.86);
  vec3 warm = vec3(1.0, 0.58, 0.22);
  vec3 ember = vec3(0.55, 0.14, 0.04);
  vec3 c = mix(hot, warm, smoothstep(0.0, 0.4, t));
  return mix(c, ember, smoothstep(0.4, 1.0, t));
}

float diskStreaks(float r, float angle, float time) {
  float omega = 2.2 / pow(max(r, 0.5), 1.5);
  float a = angle + time * omega;
  vec3 s = vec3(cos(a) * 1.6, sin(a) * 1.6, r * 4.2);
  float n = fbm(s) * 0.5 + 0.5;
  float thin = snoise(vec3(cos(a) * 3.0, sin(a) * 3.0, r * 16.0)) * 0.5 + 0.5;
  return n * 0.75 + thin * 0.35;
}
`;

export const diskFragment = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uBrightness;
varying vec2 vLocal;
varying vec3 vWorldPos;

${NOISE}
${DISK_COMMON}

void main() {
  float r = length(vLocal);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float angle = atan(vLocal.y, vLocal.x);
  float density = smoothstep(0.0, 0.06, t) * pow(1.0 - t, 1.7);
  float streaks = diskStreaks(r, angle, uTime);

  // Doppler: o lado que vem na direção da câmera brilha mais.
  vec3 tangent = normalize(vec3(-vWorldPos.z, 0.0, vWorldPos.x));
  vec3 toCam = normalize(cameraPosition - vWorldPos);
  float doppler = 1.0 + 0.6 * dot(tangent, toCam);

  vec3 color = diskColor(t) * density * (0.35 + streaks) * doppler * uBrightness;
  gl_FragColor = vec4(color, clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0));
  #include <colorspace_fragment>
}
`;

// Imagem "lenteada" do disco + anel de fótons, num plano sempre virado para a câmera.
export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
uniform float uTime;
uniform float uExtent;
uniform float uHorizon;
uniform float uBrightness;
varying vec2 vUv;

${NOISE}
${DISK_COMMON}

void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uExtent;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float rn = r / uHorizon;

  // Zera tudo antes da borda do plano (senão o sRGB revela o quadrado).
  float edge = 1.0 - smoothstep(uExtent * 0.6, uExtent * 0.95, r);
  // Saída antecipada: dentro do horizonte (coberto pela esfera) e fora do alcance do brilho
  // não há nada a desenhar. É a maior parte do plano.
  if (rn < 0.98 || edge <= 0.0) discard;

  // Arco lenteado: mais largo em cima, mais fino embaixo.
  float upper = smoothstep(-0.6, 0.9, p.y / max(r, 0.001));
  float width = mix(0.22, 0.62, upper);
  float arc = smoothstep(1.05, 1.16, rn) * (1.0 - smoothstep(1.16, 1.16 + width, rn));
  vec3 lensed = vec3(0.0);
  // O ruído (a parte cara) só roda onde o arco aparece.
  if (arc > 0.001) {
    float t = clamp((rn - 1.1) / 0.9, 0.0, 1.0);
    float streaks = diskStreaks(rn * 2.2, -angle, uTime * 0.7);
    lensed = diskColor(t) * arc * (0.3 + streaks) * mix(0.35, 1.0, upper);
  }

  // Anel de fótons, fino e quase branco.
  float ring = exp(-pow((rn - 1.07) / 0.022, 2.0));
  vec3 photon = vec3(1.0, 0.9, 0.78) * ring * 1.1;

  // Brilho difuso ao redor.
  float glow = exp(-max(rn - 1.0, 0.0) * 1.6) * 0.08 * smoothstep(0.98, 1.06, rn);
  vec3 halo = vec3(1.0, 0.55, 0.22) * glow;

  vec3 color = (lensed + photon + halo) * uBrightness * edge;
  gl_FragColor = vec4(color, clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
