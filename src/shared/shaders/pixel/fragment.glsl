uniform sampler2D uMap;
uniform float uPixelSize;
uniform float uPaletteSize;
varying vec2 vUv;

void main() {
  float pixelSize = max(uPixelSize, 8.0);
  vec2 pixelUv = floor(vUv * pixelSize) / pixelSize;
  
  vec3 color = texture2D(uMap, pixelUv).rgb;
  
  float levels = max(uPaletteSize, 2.0);
  color = floor(color * levels) / levels;
  
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color += (dither - 0.5) * 0.05;
  
  gl_FragColor = vec4(color, 1.0);
}
