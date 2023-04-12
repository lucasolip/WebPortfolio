export default `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat4 vModelViewMatrix;

uniform float time;

void main() {
    vUv = uv;
    vNormal = normal;
    vec3 offset = vec3(0.0, 0.0, 0.0);
    vec4 modelViewPosition = modelViewMatrix * vec4(position + offset, 1.0);
    vModelViewMatrix = modelViewMatrix;
    gl_Position = projectionMatrix * modelViewPosition;
    vPosition = gl_Position.xyz;
}
`;