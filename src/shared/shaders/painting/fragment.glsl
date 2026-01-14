uniform float uTime;
uniform sampler2D uMap;
uniform vec2 uTexelSize;
uniform float uBrushSize;
uniform float uPosterize;

varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;

const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
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
  vec2 p = vUv;
  vec2 texelSize = max(uTexelSize, vec2(1.0 / 512.0));
  
  float lumL = dot(texture2D(uMap, p - vec2(texelSize.x, 0.0)).rgb, LUMINANCE_WEIGHTS);
  float lumR = dot(texture2D(uMap, p + vec2(texelSize.x, 0.0)).rgb, LUMINANCE_WEIGHTS);
  float lumU = dot(texture2D(uMap, p + vec2(0.0, texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float lumD = dot(texture2D(uMap, p - vec2(0.0, texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  
  vec2 gradient = vec2(lumR - lumL, lumU - lumD);
  vec2 flowDir = normalize(vec2(-gradient.y, gradient.x) + 0.001);
  
  float brushSize = max(uBrushSize, 0.002);
  float flowAmount = sin(uTime * 0.3 + p.x * 10.0) * 0.002;
  
  vec3 centerSample = texture2D(uMap, p + flowAmount).rgb;
  vec3 forwardSample = texture2D(uMap, p + flowDir * brushSize + flowAmount).rgb;
  vec3 backwardSample = texture2D(uMap, p - flowDir * brushSize + flowAmount).rgb;
  
  vec3 brushedColor = centerSample * 0.5 + forwardSample * 0.25 + backwardSample * 0.25;
  
  float blockNoise = noise(p * 60.0);
  vec2 blockOffset = vec2(
    (blockNoise - 0.5) * 0.015,
    (noise(p * 60.0 + 100.0) - 0.5) * 0.015
  );
  vec3 blockColor = texture2D(uMap, p + blockOffset).rgb;
  
  vec3 paintColor = mix(brushedColor, blockColor, 0.3);
  
  float posterizeLevels = max(uPosterize, 2.0);
  float dither = (rand(p * 200.0 + uTime * 0.1) - 0.5) * 0.05;
  paintColor = floor((paintColor + dither) * posterizeLevels) / posterizeLevels;
  
  vec3 gray = vec3(dot(paintColor, LUMINANCE_WEIGHTS));
  paintColor = mix(gray, paintColor, 1.3);
  
  float canvasX = sin(p.x * 400.0) * 0.015;
  float canvasY = sin(p.y * 400.0) * 0.015;
  float canvas = (canvasX + canvasY) * 0.5 + 0.5;
  canvas = 0.95 + canvas * 0.1;
  
  vec3 normal = normalize(vNormal);
  float varnish = pow(max(0.0, dot(normal, vec3(0.0, 0.0, 1.0))), 8.0) * 0.08;
  
  vec3 finalColor = paintColor * canvas + vec3(varnish);

  float viewLighting = 0.75 + 0.25 * dot(normal, vec3(0.0, 0.0, 1.0));
  finalColor *= viewLighting;

  float edgeFadeX = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x);
  float edgeFadeY = smoothstep(0.0, 0.05, vUv.y) * smoothstep(0.0, 0.05, 1.0 - vUv.y);
  float edgeAlpha = edgeFadeX * edgeFadeY;

  float depthFog = smoothstep(0.0, 0.5, vDepth) * 0.15;
  finalColor = mix(finalColor, vec3(0.02), depthFog);
  
  gl_FragColor = vec4(finalColor, edgeAlpha);
}
