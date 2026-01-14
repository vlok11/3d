uniform float uEdgeFade;

float calculateEdgeFade(vec2 uv) {
    float fadeX = smoothstep(0.0, 0.08, uv.x) * smoothstep(0.0, 0.08, 1.0 - uv.x);
    float fadeY = smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
    return mix(1.0, fadeX * fadeY, uEdgeFade);
}

float calculateAlphaFade(vec2 uv, float fadeWidth) {
    float edgeFadeX = smoothstep(0.0, fadeWidth, uv.x) * smoothstep(0.0, fadeWidth, 1.0 - uv.x);
    float edgeFadeY = smoothstep(0.0, fadeWidth, uv.y) * smoothstep(0.0, fadeWidth, 1.0 - uv.y);
    return edgeFadeX * edgeFadeY;
}
