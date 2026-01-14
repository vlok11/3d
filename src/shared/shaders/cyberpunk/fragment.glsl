uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uTexelSize;
uniform float uNeonIntensity;
uniform float uChromaticAberration;
uniform float uNoiseIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  
  float timeSin = sin(uTime * 2.0);
  float aberrationBase = 0.005 * max(uChromaticAberration, 0.0);
  float aberration = aberrationBase + timeSin * aberrationBase * 0.4;
  
  vec3 texR = texture2D(uMap, uv + vec2(aberration, 0.0)).rgb;
  vec3 texG = texture2D(uMap, uv).rgb;
  vec3 texB = texture2D(uMap, uv - vec2(aberration, 0.0)).rgb;
  vec3 color = vec3(texR.r, texG.g, texB.b);
  
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - abs(dot(viewDir, vNormal));
  rim = rim * rim;
  
  vec3 neonPink = vec3(1.0, 0.0, 0.5);
  vec3 neonCyan = vec3(0.0, 1.0, 1.0);
  float neonMix = sin(uTime + vUv.y * 5.0) * 0.5 + 0.5;
  vec3 neonColor = mix(neonPink, neonCyan, neonMix);
  
  float neonStrength = max(uNeonIntensity, 0.0) * 0.8;
  color += neonColor * rim * neonStrength;
  
  float scanline = sin(vUv.y * 200.0 + uTime * 5.0) * 0.05;
  color -= scanline;
  
  float noiseAmount = max(uNoiseIntensity, 0.0);
  float noise = (rand(vUv + uTime * 0.01) - 0.5) * noiseAmount * 0.15;
  color += noise;
  
  color = pow(color, vec3(0.9));
  
  vec2 vignetteUv = vUv - 0.5;
  float vignette = 1.0 - length(vignetteUv) * 0.5;
  color *= vignette;
  
  gl_FragColor = vec4(color, 1.0);
}
