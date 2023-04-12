export default `
#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
    vec3 direction;
    vec3 color;
};
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif

uniform sampler2D uColorMap;
uniform sampler2D uNormalMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float alpha;
varying mat4 vModelViewMatrix;
uniform vec3 ambientLightColor;


vec3 phong() {
    vec3 normal = vNormal + texture2D(uNormalMap, vUv).rgb;
    vec3 n = normalize(vec3(vModelViewMatrix * vec4(normal, 0.0)));
    //vec3 n = normalize(vNormal * texture2D(uNormalMap, vUv).rgb * 2.0 - 1.0);
    // vec3 n = normalize(vNormal);

    vec3 s = normalize(directionalLights[0].direction);
    vec3 v = normalize(vec3(cameraPosition-vPosition));
    vec3 r = reflect(-s, n);

    float Shininess = 100.0;
    vec3 LightIntensity = vec3(1.0);
    vec3 ambient = 0.2*ambientLightColor;
    vec4 color = texture2D(uColorMap, vUv);
    vec3 diffuse = vec3(color) * max(dot(s, n), 0.0);
    vec3 specular = vec3(1.0) * pow(max(dot(r, v), 0.0), Shininess);

    return LightIntensity * (ambient + diffuse + specular);
    //return n;
    //return texture2D(uNormalMap, vUv).rgb;
}

void main() {
    gl_FragColor = vec4(phong(), alpha);
}
`;