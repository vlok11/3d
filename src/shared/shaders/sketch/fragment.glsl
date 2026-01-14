uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uTexelSize;
uniform float uStrokeWidth;
uniform float uEdgeThreshold;

varying vec2 vUv;
varying vec3 vNormal;

const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 texelSize = max(uTexelSize, vec2(1.0 / 512.0));
  
  float tl = dot(texture2D(uMap, vUv + vec2(-texelSize.x, texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float t  = dot(texture2D(uMap, vUv + vec2(0.0, texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float tr = dot(texture2D(uMap, vUv + vec2(texelSize.x, texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float l  = dot(texture2D(uMap, vUv + vec2(-texelSize.x, 0.0)).rgb, LUMINANCE_WEIGHTS);
  float r  = dot(texture2D(uMap, vUv + vec2(texelSize.x, 0.0)).rgb, LUMINANCE_WEIGHTS);
  float bl = dot(texture2D(uMap, vUv + vec2(-texelSize.x, -texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float b  = dot(texture2D(uMap, vUv + vec2(0.0, -texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  float br = dot(texture2D(uMap, vUv + vec2(texelSize.x, -texelSize.y)).rgb, LUMINANCE_WEIGHTS);
  
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);
  
  float edgeThreshold = max(uEdgeThreshold, 0.1);
  edge = smoothstep(edgeThreshold * 0.5, edgeThreshold, edge);
  
  float strokeWidth = max(uStrokeWidth, 0.5);
  float hatchFreq = 50.0 / strokeWidth;
  float hatch = step(0.5, fract(vUv.x * hatchFreq + vUv.y * hatchFreq + rand(vUv) * 0.1));
  
  vec3 paperColor = vec3(0.95, 0.93, 0.88);
  vec3 inkColor = vec3(0.1, 0.08, 0.05);
  
  float darkness = edge * 2.0 + (1.0 - dot(texture2D(uMap, vUv).rgb, LUMINANCE_WEIGHTS)) * 0.5;
  darkness = clamp(darkness, 0.0, 1.0);
  
  vec3 finalColor = mix(paperColor, inkColor, darkness * hatch);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
