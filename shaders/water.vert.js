export default `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat4 vModelViewMatrix;
varying float alpha;

uniform float time;

void main() {
    vUv = uv;
    vUv.y += time;
    // vNormal = vec3(modelViewMatrix * vec4(normal, 0.0));
    vNormal = normal;
    vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    vModelViewMatrix = modelViewMatrix;
    alpha = smoothstep(0.01, 0.02, uv.y);
    gl_Position = projectionMatrix * modelViewPosition;
}
`;