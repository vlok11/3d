varying vec2 vUv;

uniform sampler2D displacementMap;
uniform float displacementScale;
uniform float displacementBias;

void main() {
  vUv = uv;
  
  float disp = texture2D(displacementMap, uv).r;
  float finalDisp = disp * displacementScale + displacementBias;
  
  vec3 newPosition = position + normal * finalDisp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
