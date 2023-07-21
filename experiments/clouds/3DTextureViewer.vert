uniform vec2 size;

out vec2 vUV;

void main() {
    vUV = uv;
    vec2 transformedUV = (uv * size) * 2.0 - 1.0;
	gl_Position = vec4(transformedUV, 0.0, 1.0 );
}