const vec3 LUMINANCE_WEIGHTS = vec3(0.299, 0.587, 0.114);

float luminance(vec3 color) {
    return dot(color, LUMINANCE_WEIGHTS);
}

float textureLuminance(sampler2D tex, vec2 uv) {
    return dot(texture2D(tex, uv).rgb, LUMINANCE_WEIGHTS);
}
