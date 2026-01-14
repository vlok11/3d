varying vec3 vColor;
  
void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  float alpha = exp(-r * 4.0); 
  if (alpha < 0.1) discard;
  gl_FragColor = vec4(vColor, alpha);
}
