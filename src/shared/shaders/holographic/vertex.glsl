varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vDisplacement;

uniform sampler2D displacementMap;
uniform float displacementScale;
uniform float displacementBias;
uniform float uSeamCorrection;
uniform float uEdgeFade;
uniform float uParallaxScale;

float calculateEdgeFade(vec2 uv) {
    float fadeX = smoothstep(0.0, 0.08, uv.x) * smoothstep(0.0, 0.08, 1.0 - uv.x);
    float fadeY = smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
    return mix(1.0, fadeX * fadeY, uEdgeFade);
}

float getDisplacement(vec2 uv, sampler2D map) {
    float d = texture2D(map, uv).r;
    if (uSeamCorrection > 0.5) {
        float distLeft = uv.x;
        float distRight = 1.0 - uv.x;
        float dist = min(distLeft, distRight);
        float blendWidth = 0.1;
        if (dist < blendWidth) {
            float dLeft = texture2D(map, vec2(0.01, uv.y)).r;
            float dRight = texture2D(map, vec2(0.99, uv.y)).r;
            float dAvg = (dLeft + dRight) * 0.5;
            float t = smoothstep(0.0, blendWidth, dist);
            d = mix(dAvg, d, t);
        }
    }
    d *= calculateEdgeFade(uv);
    return d;
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  float disp = getDisplacement(uv, displacementMap);
  
  vDisplacement = disp;
  float finalDisp = disp * displacementScale + displacementBias;
  
  vec3 viewDir = normalize(cameraPosition - position);
  vec3 parallaxOffset = viewDir * disp * uParallaxScale * 0.5;
  
  vec3 newPosition = position + normal * finalDisp + parallaxOffset;
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
