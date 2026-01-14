varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform sampler2D uDisplacementMap;
uniform float uDisplacementScale;
uniform float uDisplacementBias;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  float disp = texture2D(uDisplacementMap, uv).r;
  float finalDisp = disp * uDisplacementScale + uDisplacementBias;
  
  vec3 newPosition = position + normal * finalDisp;
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
