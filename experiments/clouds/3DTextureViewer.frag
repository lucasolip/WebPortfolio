precision highp float;
precision highp sampler3D;

in vec2 vUV;

uniform sampler3D mainTex;
uniform sampler3D detailTex;
uniform float slice;
uniform float scale;

void main() {
    vec3 texCoord = vec3(vUV * scale, slice); // Use uv coordinates for the x and y, and 0.5 for the z-axis
    vec4 texel = texture(mainTex, texCoord);
    vec4 detailTexel = texture(detailTex, texCoord);
    gl_FragColor = vec4(vec3(texel.r*0.8 + detailTexel.r*0.2), 1.0);
}