uniform float uSeamCorrection;

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
    return d;
}
