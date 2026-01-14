uniform float time;
uniform float opacity;
uniform float scanlineDensity;
uniform float glitchIntensity;
uniform float tintIntensity;
uniform vec3 color;
uniform sampler2D map;

varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vDisplacement;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  
  float glitchLine = step(0.99 - glitchIntensity * 0.3, rand(vec2(floor(time * 15.0), floor(uv.y * 20.0))));
  float glitchOffset = glitchLine * (rand(vec2(time, uv.y)) - 0.5) * 0.1 * glitchIntensity;
  uv.x += glitchOffset * step(0.01, glitchIntensity);
  
  float aberration = 0.003 + glitchOffset * 0.5;
  vec4 texR = texture2D(map, uv + vec2(aberration, 0.0));
  vec4 texG = texture2D(map, uv);
  vec4 texB = texture2D(map, uv - vec2(aberration, 0.0));
  vec3 texColor = vec3(texR.r, texG.g, texB.b);
  
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  float viewDot = dot(viewDir, normal);
  float rim = 1.0 - abs(viewDot);
  float pulse = sin(time * 3.0) * 0.15 + 0.85; 
  float rimPower = pow(rim, 2.5) * pulse;

  float scanY = vUv.y * scanlineDensity * 25.0 + time * 8.0;
  float scanline1 = sin(scanY) * 0.5 + 0.5;
  float scanline2 = sin(scanY * 2.3 + 1.0) * 0.3 + 0.7;
  float scanline = scanline1 * scanline2;
  scanline = smoothstep(0.3, 0.7, scanline) * 0.4;
  
  float scanBar = smoothstep(0.0, 0.05, abs(fract(vUv.y - time * 0.2) - 0.5) - 0.45);
  
  float gridX = step(0.97, fract(vUv.x * 40.0));
  float gridY = step(0.97, fract(vUv.y * 40.0));
  float grid = max(gridX, gridY) * 0.12;

  float lum = dot(texColor, vec3(0.299, 0.587, 0.114));
  vec3 holoBase = color * (lum * 1.2 + 0.3);
  vec3 finalColor = mix(texColor, holoBase, tintIntensity);
  
  finalColor += color * rimPower * 1.2;
  finalColor += color * scanline;
  finalColor += color * (1.0 - scanBar) * 0.3;
  finalColor += color * grid;
  
  float edgeGlow = smoothstep(0.0, 0.3, vDisplacement) * rim * 0.5;
  finalColor += color * edgeGlow;

  float viewLighting = 0.7 + 0.3 * dot(normal, vec3(0.0, 0.0, 1.0));
  viewLighting *= 0.85 + 0.15 * dot(normal, normalize(vec3(viewDir.x, viewDir.y, 0.5)));
  finalColor *= viewLighting;

  float fogDensity = 0.15;
  float fogFactor = 1.0 - exp(-length(vViewPosition) * fogDensity * 0.05);
  vec3 fogColor = color * 0.1;
  finalColor = mix(finalColor, fogColor, fogFactor * 0.3);

  float edgeFadeX = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.x);
  float edgeFadeY = smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
  float edgeAlphaFade = edgeFadeX * edgeFadeY;

  float baseAlpha = 0.4 + 0.6 * lum;
  float finalAlpha = opacity * (baseAlpha + rimPower * 0.3);
  finalAlpha *= smoothstep(0.0, 0.15, vDisplacement + 0.05);
  finalAlpha *= edgeAlphaFade;

  gl_FragColor = vec4(finalColor, min(1.0, finalAlpha));
}
