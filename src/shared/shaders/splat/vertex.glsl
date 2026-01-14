varying vec2 vUv;
varying vec3 vColor;

uniform sampler2D uMap;
uniform sampler2D uDisplacementMap;
uniform float uDisplacementScale;
uniform float uDisplacementBias;
uniform float uPointSize;
uniform float uTime; 

void main() {
  vUv = uv;
  vec4 texColor = texture2D(uMap, uv);
  vColor = texColor.rgb;

  float disp = texture2D(uDisplacementMap, uv).r;
  float finalDisp = disp * uDisplacementScale + uDisplacementBias;
  
  float drift = sin(position.x * 5.0 + uTime) * 0.02 + cos(position.y * 5.0 + uTime * 1.2) * 0.02;

  vec3 newPosition = position + normal * (finalDisp + drift);
  
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  gl_PointSize = uPointSize * (20.0 / -mvPosition.z);
}
